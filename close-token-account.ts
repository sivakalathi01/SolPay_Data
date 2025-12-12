import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, closeAccount, transfer, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY!));
const mint = new PublicKey(process.env.USDC_MINT!);

// The token account we want to close
const tokenAccountToClose = new PublicKey('38dG7bKrEK3H9JRMVmZsjWuX4UnK18sV4NEFMR6ACE3Y');

async function closeTokenAccount() {
  console.log('Closing token account:', tokenAccountToClose.toString());
  console.log('Owner:', payer.publicKey.toString());
  console.log('');

  try {
    // Step 1: Get the balance
    const accountInfo = await getAccount(connection, tokenAccountToClose);
    const balance = accountInfo.amount;
    console.log(`Balance in account: ${Number(balance) / 1_000_000} USDC`);

    if (balance > 0) {
      // Step 2: Transfer tokens to main account
      const destinationAccount = await getAssociatedTokenAddress(mint, payer.publicKey);
      console.log(`Transferring to: ${destinationAccount.toString()}`);
      
      const transferSig = await transfer(
        connection,
        payer,
        tokenAccountToClose,
        destinationAccount,
        payer,
        balance
      );
      
      console.log('✅ Tokens transferred:', transferSig);
    }

    // Step 3: Close the empty account
    const closeSig = await closeAccount(
      connection,
      payer,
      tokenAccountToClose,
      payer.publicKey,  // Destination for remaining SOL rent
      payer             // Owner of the token account
    );

    console.log('✅ Token account closed!');
    console.log('Transaction:', closeSig);
    console.log('🔍 View: https://explorer.solana.com/tx/' + closeSig + '?cluster=devnet');
    console.log('');
    console.log('✨ All done! Tokens reclaimed and account closed.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('This might happen if:');
    console.log('- You are not the owner of this token account');
    console.log('- The account is already closed');
    console.log('- The account has a delegate or other restrictions');
  }
}

closeTokenAccount();
