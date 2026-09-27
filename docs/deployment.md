# Production deployment guide

Hunty can be hosted on any Node.js-capable platform, but Vercel is the recommended path for the Next.js web app.

## Deploying to Vercel

1. Create a new Vercel project from the Hunty repository.
2. Set the root directory to the web app if you deploy from a monorepo workspace.
3. Configure the production environment variables below.
4. Deploy the project and assign a custom domain once the first build succeeds.

## Required production environment variables

At minimum, configure the following values in Vercel or your hosting provider:

- `NEXT_PUBLIC_ENVIRONMENT=production`
- `NEXT_PUBLIC_BASE_URL=https://your-domain.com`
- `NEXT_PUBLIC_SOROBAN_RPC_URL` set to either the testnet or mainnet RPC endpoint
- `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` matching the selected network
- `NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet` or `mainnet`
- `NEXT_PUBLIC_HUNTY_CORE_ADDRESS`
- `NEXT_PUBLIC_REWARD_MANAGER_ADDRESS`
- `NEXT_PUBLIC_NFT_REWARD_ADDRESS`
- `PINATA_JWT` for IPFS uploads
- `RESEND_API_KEY` for reminder and notification emails
- `NEXT_PUBLIC_WC_PROJECT_ID` for wallet support
- `DATABASE_URL` for the PostgreSQL database used by the app

## Pinata for IPFS

Hunty uses IPFS for hunt media and NFT metadata. Create a Pinata account and generate a JWT for the API route that uploads files.

- Sign up at https://pinata.cloud
- Create a new API key or JWT
- Store the value as `PINATA_JWT` in your production environment
- Optionally configure a custom gateway domain if you want branded IPFS URLs

## Resend for email notifications

Reminder emails and notification delivery depend on Resend.

- Create an account at https://resend.com
- Create an API key and store it as `RESEND_API_KEY`
- Configure the sender address and any domain verification you want to use for production mail

## Stellar network selection

Choose your network before deployment:

- Use `testnet` during staging and validation.
- Use `mainnet` for live production deployments.

The app reads the network from the Soroban environment variables, so update the contract addresses and network passphrase together whenever you switch networks.

## Custom domain setup

After the initial deployment:

1. Add your domain in Vercel.
2. Configure the DNS records provided by Vercel.
3. Update `NEXT_PUBLIC_BASE_URL` to the final production URL.
4. Redeploy so the app serves the correct canonical URL.
