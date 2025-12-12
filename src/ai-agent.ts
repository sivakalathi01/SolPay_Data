import OpenAI from 'openai';
import dotenv from 'dotenv';
import { SolanaOracleAgent } from './agent-client';

dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available oracle endpoints with descriptions
const ORACLE_CAPABILITIES = `
You are an AI agent that can query blockchain data by paying for it automatically using Solana USDC.
You have access to the following oracle endpoints (you will automatically pay for these):

1. /api/v1/price/:token - Get real-time token price ($0.01 USDC)
   - Example: /api/v1/price/So11111111111111111111111111111111111111112 (for SOL price)
   
2. /api/v1/wallet/:address - Get wallet balance and holdings ($0.005 USDC)
   - Example: /api/v1/wallet/DSFZhz75xUudv7pYN9eptrHZ6Ph1HXoeiCXidLY3SUCy
   
3. /api/v1/holders/:mint - Get token holder information ($0.05 USDC)
   - Example: /api/v1/holders/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   
4. /api/v1/transactions/:address - Get transaction history ($0.10 USDC)
   - Example: /api/v1/transactions/DSFZhz75xUudv7pYN9eptrHZ6Ph1HXoeiCXidLY3SUCy
   
5. /api/v1/analytics/:mint - Get comprehensive token analytics ($0.20 USDC)
   - Example: /api/v1/analytics/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

6. /api/v1/cross-chain/balance/:address - Get BOTH Solana AND Ethereum balances ($0.01 USDC)
   - Example: /api/v1/cross-chain/balance/DSFZhz75xUudv7pYN9eptrHZ6Ph1HXoeiCXidLY3SUCy

Known token addresses:
- SOL (Solana): So11111111111111111111111111111111111111112
- USDC (Solana): EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

IMPORTANT: 
- Always include the leading slash (/) in endpoint paths
- Replace :token, :address, :mint with actual values
- Return ONLY a JSON array of complete endpoint paths
- Example response: ["/api/v1/price/So11111111111111111111111111111111111111112"]

When a user asks a question, determine which endpoint(s) to call and respond with ONLY a JSON array of endpoints.
`;

class AIAgent {
  private agent: SolanaOracleAgent;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  constructor(privateKey: string, oracleUrl: string) {
    this.agent = new SolanaOracleAgent(privateKey, oracleUrl);
    
    // System prompt
    this.conversationHistory.push({
      role: 'system',
      content: ORACLE_CAPABILITIES,
    });
  }

  async chat(userMessage: string): Promise<string> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`👤 User: ${userMessage}`);
    console.log(`${'='.repeat(70)}\n`);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      // Step 1: Ask AI to determine which endpoints to call
      console.log('🤖 AI thinking...');
      const planResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          ...this.conversationHistory,
          {
            role: 'user',
            content: `Based on the user's question, which oracle endpoints should I call? 
            
CRITICAL RULES:
1. Replace ALL placeholders (:token, :address, :mint) with actual values
2. Use the user's Solana wallet: ${this.agent.wallet.publicKey.toBase58()}
3. Use the user's Ethereum wallet: ${process.env.SERVER_ETH_WALLET}
4. When user asks about USDC, use this custom token mint: ${process.env.USDC_MINT}
5. For Ethereum/ETH queries, use cross-chain endpoint with Ethereum address: /api/v1/cross-chain/balance/${process.env.SERVER_ETH_WALLET}
6. For Solana queries, use regular wallet endpoint: /api/v1/wallet/${this.agent.wallet.publicKey.toBase58()}
7. If user asks about "cross-chain" or "both chains", query BOTH addresses separately
8. Return ONLY a valid JSON array of complete endpoint paths with NO placeholders
9. Each endpoint must be ready to call directly

Important addresses:
- Solana wallet: ${this.agent.wallet.publicKey.toBase58()}
- Ethereum wallet: ${process.env.SERVER_ETH_WALLET}
- USDC (custom): ${process.env.USDC_MINT}
- SOL: So11111111111111111111111111111111111111112

Query selection examples:
- "What's my Ethereum balance?" → ["/api/v1/cross-chain/balance/${process.env.SERVER_ETH_WALLET}"]
- "Check my Solana wallet" → ["/api/v1/wallet/${this.agent.wallet.publicKey.toBase58()}"]
- "Show both chains" → ["/api/v1/wallet/${this.agent.wallet.publicKey.toBase58()}", "/api/v1/cross-chain/balance/${process.env.SERVER_ETH_WALLET}"]
- "SOL price" → ["/api/v1/price/So11111111111111111111111111111111111111112"]

Respond ONLY with the JSON array.`,
          },
        ],
        temperature: 0.3,
      });

      const plan = planResponse.choices[0].message.content || '[]';
      console.log(`📋 AI Plan: ${plan}\n`);

      let endpoints: string[] = [];
      try {
        endpoints = JSON.parse(plan);
      } catch {
        // If AI didn't return JSON, extract endpoints manually
        const matches = plan.match(/\/api\/v1\/[^\s\]"]+/g);
        endpoints = matches || [];
      }

      // Step 2: Execute queries and collect data
      const oracleData: any[] = [];
      for (let endpoint of endpoints) {
        // Ensure endpoint starts with /
        if (!endpoint.startsWith('/')) {
          endpoint = '/' + endpoint;
        }
        
        // Validate endpoint doesn't contain placeholders
        if (endpoint.includes(':')) {
          console.log(`❌ Invalid endpoint (contains placeholder): ${endpoint}`);
          console.log(`   Skipping this query...`);
          oracleData.push({ 
            endpoint, 
            error: 'Invalid endpoint - contains placeholder. Please specify actual values for :token, :address, or :mint' 
          });
          continue;
        }
        
        console.log(`💰 Querying oracle: ${endpoint}`);
        try {
          const data = await this.agent.query(endpoint);
          oracleData.push({ endpoint, data });
          console.log(`✅ Data received\n`);
        } catch (error: any) {
          console.log(`❌ Failed: ${error.message}\n`);
          oracleData.push({ endpoint, error: error.message });
        }
      }

      // Step 3: Ask AI to synthesize response with the data
      const dataContext = oracleData.length > 0
        ? `I successfully queried the oracle and received this data:\n${JSON.stringify(oracleData, null, 2)}`
        : 'No oracle queries were needed for this question.';

      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          ...this.conversationHistory,
          {
            role: 'assistant',
            content: dataContext,
          },
          {
            role: 'user',
            content: `Now answer the original user question using the oracle data provided above. 
            
IMPORTANT:
- Use the ACTUAL data from the oracle response
- Present numbers, balances, and values from the data
- Be specific and helpful
- When mentioning cost, use this EXACT value: $${this.agent.stats.totalSpent.toFixed(3)} USDC (DO NOT calculate or estimate - use this exact number)
- If there were errors, explain them clearly
- DO NOT just describe the endpoint - use the actual data returned!

Cross-chain query handling:
- When querying /api/v1/cross-chain/balance with a single-chain address, IGNORE errors from the other chain
- Examples of errors to IGNORE and NOT MENTION:
  * "Solana address provided - cannot query Ethereum chain"
  * "Ethereum address provided - cannot query Solana chain"
  * "Invalid Ethereum address or fetch failed" (when using Solana address)
  * "Invalid Solana address or fetch failed" (when using Ethereum address)
- ONLY report the successful chain's data
- DO NOT apologize for or mention these expected incompatibility errors

Token Information - ALWAYS use these names when describing tokens:
- When referring to mint ${process.env.USDC_MINT}, ALWAYS call it "Custom Test USDC"
- When tokens have a "name" field in the data, ALWAYS use that name
- For Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr, ALWAYS say "Devnet USDC" or "USDC (Devnet)"
- NEVER say "the second token" or "the other token" - always use the actual token name
- Examples:
  * Good: "Devnet USDC has 0 balance"
  * Bad: "The second token has 0 balance"
  * Good: "You have 998.55 Custom Test USDC"
  * Bad: "You have 998.55 of token Chkg2bc..."
- Always prefer showing token symbols and names over raw mint addresses`,
          },
        ],
        temperature: 0.7,
      });

      const answer = finalResponse.choices[0].message.content || 'Unable to generate response.';

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: answer,
      });

      console.log(`🤖 AI Response:\n${answer}\n`);
      
      // Show statistics
      console.log(`${'='.repeat(70)}`);
      console.log(`📊 Session Stats:`);
      console.log(`   Oracle queries made: ${this.agent.stats.queriesMade}`);
      console.log(`   Successful payments: ${this.agent.stats.successfulPayments}`);
      console.log(`   Total spent: $${this.agent.stats.totalSpent.toFixed(3)} USDC`);
      console.log(`${'='.repeat(70)}\n`);

      return answer;
    } catch (error: any) {
      console.error(`❌ AI Error: ${error.message}`);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }

  async interactive() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🤖 AI-Powered Blockchain Oracle Agent                 ║');
    console.log('║     Ask me anything about Solana blockchain data!         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`💰 Wallet: ${this.agent['wallet'].publicKey.toBase58()}`);
    console.log(`🔗 Oracle: ${this.agent['baseUrl']}\n`);
    console.log('Type your questions, or "exit" to quit.\n');

    const askQuestion = () => {
      rl.question('👤 You: ', async (input: string) => {
        const question = input.trim();

        if (question.toLowerCase() === 'exit') {
          console.log('\n👋 Goodbye!');
          rl.close();
          process.exit(0);
        }

        if (!question) {
          askQuestion();
          return;
        }

        await this.chat(question);
        askQuestion();
      });
    };

    askQuestion();
  }
}

// Demo function
async function demo() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  if (!process.env.SOLANA_PRIVATE_KEY) {
    console.error('❌ Please set SOLANA_PRIVATE_KEY in your .env file');
    process.exit(1);
  }

  const agent = new AIAgent(
    process.env.SOLANA_PRIVATE_KEY,
    process.env.ORACLE_URL || 'http://localhost:3402'
  );

  // Interactive mode
  await agent.interactive();
}

demo();

export { AIAgent };
