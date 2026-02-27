import 'dotenv/config';

export const config = {
    port:             Number(process.env['PORT'] ?? 3002),
    twitterClientId:  process.env['TWITTER_CLIENT_ID'] ?? '',
    twitterClientSecret: process.env['TWITTER_CLIENT_SECRET'] ?? '',
    opnetRpcUrl:      process.env['OPNET_RPC_URL'] ?? 'https://testnet.opnet.org',
    frontendUrl:      process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
    frontendUrlProd:  process.env['FRONTEND_URL_PROD'] ?? 'https://opdev-tech.pages.dev',
    twitterCallbackUrl: process.env['TWITTER_CALLBACK_URL'] ?? 'http://localhost:3002/api/twitter/callback',
};

export const MOTOSWAP_ROUTER = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';
export const DEVTECH_ADDRESS = process.env['DEVTECH_ADDRESS'] ?? 'opt1sqr6x7mejkufn7n9xkue6k6s9xlq2xvxkzvv3w8ap';
