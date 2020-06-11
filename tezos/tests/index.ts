import { tezosService } from "../src/tezos.service";
import { originator, tokenService } from "../src/token.service";

import sampleContract from '../contracts/sample-contract.json';
import { SampleContract } from "../src/sample.contract";
import gameContractJSON from '../src/game.contract.json';
import { GameContract } from "../src/game.contract";
import { CryptoUtils, TezosMessageUtils, KeyStore } from "conseiljs";

console.log('Hello World!');

const sampleStorage = 
{
    "prim": "Pair",
    "args": [
        [],
        {
            "string": originator
        }
    ]
}

const gameStorage = (originator: KeyStore, creator: string) => {
    return {
    "prim": "Pair",
    "args": [
      {
        "prim": "Pair",
        "args": [
          { "prim": "Pair", "args": [ { "prim": "False" }, { "prim": "Pair", "args": [ { "int": "0" }, { "string": creator } ] } ] },
          { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "int": "-1" }, { "string": originator.publicKeyHash } ] } ] }
        ]
      },
      {
        "prim": "Pair",
        "args": [
          {
            "prim": "Pair",
            "args": [
              { "int": "-1" },
              { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "string": originator.publicKey } ] }
            ]
          },
          { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ [], { "string": "created" } ] } ] }
        ]
      }
    ]
  };
};


const redeploy = true;
const testGameContract = true;
const testSampleContract = false;
const sampleContractAddress = 'KT1BLuqcTJr2csiiZecpeEPmC9mHQh7hevN2';

async function sign(message: Buffer, secret_key: string) {
    // const key = Buffer.from(secret_key);
    const key = TezosMessageUtils.writeKeyWithHint(secret_key, 'edpk');
    const hash = CryptoUtils.simpleHash(message, 32);
    return (await CryptoUtils.signDetached(hash, key));
    // return message.toString('hex');
}

tezosService.initAccount(originator).then(async ({keyStore, secret}) => {
    console.log('Originator Account is initialized:', keyStore);
    // const priv_key = 'edskRijgcXx8gzqkq7SCBbrb6aDZQMmP6dznCQWgU1Jr4qPfJT1yFq5A39ja9G4wahS8uWtBurZy14Hy7GZkQh7WnopJTKtCQG';
    // console.log('private_key', priv_key);
    // const message = Buffer.from('05070700000707010000000b73686f756c6420776f726b010000000b48656c6c6f20576f726c64', 'hex');
    // console.log('message', message.toString('hex'));
    // console.log(message);
    // const signature = await sign(message, priv_key);
    // console.log('signature', signature);
    // const expected = 'edsigtjkG9bcvUhWPoHgpbHHQYZCQVB6F2hVokCsG8dwCF1cb6vtaLbDKuMNRJUDu3Jk4tAnauFGVPcGnQyhUgNW3R6uiChD1EC';
    // console.log('expected', expected)
    // // const expBuffer = TezosMessageUtils.writeSignatureWithHint(expected, 'edsig');
    // console.log('same = ', expected === signature.toString());
    // const sig2 = TezosMessageUtils.readSignatureWithHint(signature, 'edsig');
    // return;
    await new Promise((resolve, reject) => {
        tezosService.activateAccount(keyStore, secret).then((publicKeyHash) => {
            console.log(`Originator Account ${publicKeyHash} is activated`);
            resolve();
        }).catch(err => {
            console.error(`[ERROR] activateAccount(${keyStore.publicKeyHash}) failed -> ${err}`);
            resolve();
        });   
    });
    await new Promise((resolve, reject) => {
        tezosService.revealAccount(keyStore).then((source) => {
            console.log('Account has been revealed', source);
            resolve();
        }).catch(err => {
            console.error(`[ERROR] revealAccount(${keyStore.publicKeyHash}) failed -> ${err}`);
            resolve();
        });
    });
    await new Promise((resolve, reject) => {
        tezosService.checkAccount(keyStore.publicKeyHash).then((result) => {
            console.log('getAccount -> ', result);
            resolve();
        }).catch(err => {
            console.error(`[ERROR] getAccount(${keyStore.publicKeyHash}) failed -> ${err}`);
            resolve();
        });
    });
    try {
        await tezosService.accountInfo(keyStore.publicKeyHash);
    } catch(err) {
        console.error(`[ERROR] accountInfo failed with error:${err}`);
    }
    await tezosService.getNetworks();
    if (testGameContract) {
        let gameContractAddress = '';
        if (redeploy) {
            await tezosService.deployContract(
                JSON.stringify(gameContractJSON),
                JSON.stringify(gameStorage(keyStore, 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki')),
                keyStore
            ).then(address => {
                console.log('Game contract deployed at ', address);
                gameContractAddress = address;
            });
        } else {
            gameContractAddress = 'KT1UfWhmWx13Nvd7rECZUjs3oQNJfFRRmVRn'
        }
        const gameContract = await GameContract.retrieve(gameContractAddress);
        gameContract.update().then(async (gameStorage) => {
            console.log('game storage:', JSON.stringify(gameStorage));
            const signature = await tezosService.make_signature(Buffer.from('xxxxxx'), keyStore.privateKey);
            // gameContract.register(keyStore, 123456, '"xxxxxxxx"').then(() => {
            tezosService.invokeContract(keyStore, gameContract.address, 'register', [123456, signature]).then(() => {
                console.log('registered user');
                gameContract.update().then((gameStorage) => {
                    console.log('game storage:', JSON.stringify(gameStorage));
                }).catch(err => {
                    console.error(err)
                });
            }).catch(err => {
                console.error('register failed');
                console.error(err)
            });
        }).catch(err => {
            console.error(err)
        });
    }
    if (testSampleContract) {
        await new Promise((resolve, reject) => {
            new Promise<string>((resolve2, reject2) => {
                if (redeploy) {
                    tezosService.deployContract(
                        JSON.stringify(sampleContract),
                        JSON.stringify(sampleStorage),
                        keyStore
                    ).then(address => resolve2(address)
                    ).catch(err => reject2(err));
                } else {
                    resolve2(sampleContractAddress);
                }
            }).then((address) => {
                const contract = new SampleContract(address);
                contract.update().then(() => {
                    console.log('SampleContract.owner:', contract.storage?.owner);
                    contract.storage?.nameToEvent.forEach((value, key) => {
                        console.log(`Event ${key}: ${JSON.stringify(value)}`);
                    });
                    const easterEvent = contract.storage?.nameToEvent.get('easter');
                    if (!easterEvent) {
                        throw new Error('Unable to find the easter event in the contract storage');
                    }
                    const easterNumGuest = parseInt(easterEvent.numGuests.valueOf());
                    tezosService.readContract(address).then((storage) => {
                        console.log(`initial storage: ${JSON.stringify(storage)}`);
                        tezosService.parseContract(address).then((entryPointsMap) => {
        
                            // const setNumGuestsEP = entryPointsMap.get('setNumGuests');
                            // const params = setNumGuestsEP?.generateInvocationPair('"christmas party"', 19);
                            // console.log('params', params?.parameters);
                            // tezosService.invokeContract(keyStore, address, params?.parameters, params?.entrypoint).then(() => {
                            tezosService.invokeContract(keyStore, address, 'setNumGuests', ['"easter"', easterNumGuest + 1 ]).then(() => {
                                contract.update().then(() => {
                                    console.log('SampleContract.owner:', contract.storage?.owner);
                                    contract.storage?.nameToEvent.forEach((value, key) => {
                                        console.log(`Event ${key}: ${JSON.stringify(value)}`);
                                    });
                        
                                    console.log('The End !');
                                    resolve();
                                }).catch(err => {
                                    console.error('[ERROR] invoke sample contract failed with error:' + err);
                                    resolve();
                                })
                            }).catch(err => {
                                console.error('[ERROR] invoke sample contract failed with error:' + err);
                                resolve();
                            })
                        }).catch(err => {
                            console.error('[ERROR] parse sample contract failed with error:' + err);
                            resolve();
                        })
                    }).catch(err => {
                        console.error('[ERROR] read sample contract failed with error:' + err);
                        resolve();
                    })
                }).catch(err => {
                    console.error(err);
                    throw err;
                });
                
            }).catch(err => {
                console.error(`[ERROR] deploy sample contract failed with error:${err}`);
                resolve();
            });
        });
    }
}).catch(err => {
    console.error('Originator Account initialization failed with error: ' + err);
});

