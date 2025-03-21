import dotenv from 'dotenv';
dotenv.config();

export const orgConfig = {
  orgCredentials: {
    secretKey: '0ac97ffdd83769c6c5032cb202d0957800e0ef151f015b0aaec52e2d864d4fc6',
    orgDid: 'did:nil:testnet:nillion1v596szek38l22jm9et4r4j7txu3v7eff3uffue',
  },
  nodes: [
    {
      url: 'https://nildb-nx8v.nillion.network',
      did: 'did:nil:testnet:nillion1qfrl8nje3nvwh6cryj63mz2y6gsdptvn07nx8v',
    },
    {
      url: 'https://nildb-p3mx.nillion.network',
      did: 'did:nil:testnet:nillion1uak7fgsp69kzfhdd6lfqv69fnzh3lprg2mp3mx',
    },
    {
      url: 'https://nildb-rugk.nillion.network',
      did: 'did:nil:testnet:nillion1kfremrp2mryxrynx66etjl8s7wazxc3rssrugk',
    },
  ],
};