import { tezosService } from "../src/tezos.service";
import { originator, tokenService } from "../src/token.service";

import sampleContract from '../contracts/sample-contract.json';
import { SampleContract } from "../src/sample.contract";
// import gameContractJSON from '../src/game.contract.json';
import { GameContract } from "../src/game.contract";
import { CryptoUtils, TezosMessageUtils, KeyStore } from "conseiljs";
import { AssetsContract, IAssetParams } from "../src/assets.contract";
import { TokenContract } from "../src/token.contract";
import BigNumber from "bignumber.js";
import { ChanceContract, IChanceParams } from "../src/chance.contract";
import { Operation } from "@taquito/taquito/dist/types/operations/operations";
import { RpcClient, MichelsonV1Expression } from '@taquito/rpc';
import { ParameterSchema } from '@taquito/michelson-encoder';

console.log('Hello World!');

function a(...args: any[]) {
    console.log(`a(${args})`);
    console.log(`a -> arg1:${args[0]}`);
}

function b(...args: any[]) {
    console.log(`b(${args})`);
    console.log(`b -> arg1:${args[0]}`);
    console.log('b calling a:');
    a(args);
    a.call(null, args);
    a.apply(null, args);
}

a(1,2,3);
b(4,5,6);

const _payload = {dice1:6,dice2:6,newPosition:9,cardId:19,options:["GENESIS","STARTUP_FOUND","NOTHING"],assetId:9};
console.log(_payload['dice2']);
console.log('payload fields: ', Object.keys(_payload).sort().map(field => Object.getOwnPropertyDescriptor(_payload, field)?.value));


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

// const gameStorage = (originator: KeyStore, creator: string) => {
//     return {
//     "prim": "Pair",
//     "args": [
//       {
//         "prim": "Pair",
//         "args": [
//           { "prim": "Pair", "args": [ { "prim": "False" }, { "prim": "Pair", "args": [ { "int": "0" }, { "string": creator } ] } ] },
//           { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "int": "-1" }, { "string": originator.publicKeyHash } ] } ] }
//         ]
//       },
//       {
//         "prim": "Pair",
//         "args": [
//           {
//             "prim": "Pair",
//             "args": [
//               { "int": "-1" },
//               { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "string": originator.publicKey } ] }
//             ]
//           },
//           { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ [], { "string": "created" } ] } ] }
//         ]
//       }
//     ]
//   };
// };

const redeploy = false;
const redeploy_game = true;
const redeploy_assets = true;
const redeploy_token = true;
const redeploy_chances = true;
let gameContractAddress = '';
let assetsContractAddress = '';
let tokenContractAddress = '';
let chanceContractAddress = '';

const register_alice = false;
const register_bob = true;
const reset_game = true;
const testGameContract = false;
const testAssetContract = false;
const testSampleContract = false;
const sampleContractAddress = 'KT1BLuqcTJr2csiiZecpeEPmC9mHQh7hevN2';

const allAssets: IAssetParams[] = [
    {assetId: 0, type: 'STARTUP', price: 200, featurePrice: 50, rentRates: [12, 36, 150, 250, 500]},
    {assetId: 1, type: 'STARTUP', price: 200, featurePrice: 50, rentRates: [12, 36, 150, 250, 500]},
    {assetId: 2, type: 'STARTUP', price: 200, featurePrice: 50, rentRates: [12, 36, 150, 250, 500]},
    {assetId: 3, type: 'STARTUP', price: 200, featurePrice: 50, rentRates: [12, 36, 150, 250, 500]},
    {assetId: 4, type: 'STARTUP', price: 500, featurePrice: 50, rentRates: [12, 36, 150, 250, 500]}
];

const allChances: IChanceParams[] = [
    {id: 0, type: 'receive_amount', param: 100},
    {id: 1, type: 'pay_amount', param: 100},
    {id: 2, type: 'go_to_space', param: 15},
    {id: 3, type: 'move_n_spaces', param: -3},
    {id: 4, type: 'covid_immunity', param: 0},
    {id: 5, type: 'go_to_quarantine', param: 0},
    {id: 6, type: 'go_to_space', param: 14},
    {id: 7, type: 'move_n_spaces', param: 3}
];

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

    const rpcClient = new RpcClient(tezosService.getNode());

    const payload = {dice1:6,dice2:6,newPosition:9,cardId:19,options:["GENESIS","STARTUP_FOUND","NOTHING"],assetId:9};
    await tezosService.make_signature(Buffer.from(JSON.stringify(payload)), keyStore.privateKey).then(signature => {
        console.log('payload', JSON.stringify(payload));
        console.log('signature', signature);
    })
    const payload2 = {assetId:9, cardId:19,dice1:6,dice2:6,newPosition:9,options:["NOTHING", "STARTUP_FOUND", "GENESIS"]};
    await tezosService.make_signature(Buffer.from(JSON.stringify(payload2)), keyStore.privateKey).then(signature => {
        console.log('payload', JSON.stringify(payload2));
        console.log('signature', signature);
    })
    const payload3 = {assetId:9, cardId:19,dice1:6,dice2:6,newPosition:9,options:["NOTHING", "STARTUP_FOUND", "GENESIS"]};
    tezosService.packData2(GameContract.payloadFormat, payload3)
    .then((thingsToSign3) => {
        tezosService.make_signature(thingsToSign3, keyStore.privateKey).then(signature => {
            console.log('payload', JSON.stringify(payload3));
            console.log('thingsToSign', JSON.stringify(thingsToSign3));
            console.log('signature', signature);
        }).catch(err => {
            console.error(err);
        });
    }).catch(err => {
        console.error(err);
    });
    // const thingsToSign3 = Buffer.from(JSON.stringify(payload3));
    // TODO: also possible with TezosMessageUtils.writePackedData from conseil-js
    // const schema = new ParameterSchema( GameContract.payloadFormat );
    //  const data = schema.Encode(payload3.assetId, payload3.cardId, payload3.dice1, payload3.dice2, payload3.newPosition, payload3.options);
    //  console.log('data', JSON.stringify(data));
    // rpcClient.packData({
    //     // data: {
    //     //     "prim": "Pair",
    //     //     "args": [
    //     //       { "prim": "Pair", "args": [ { "int": "9" }, { "int": "5" } ] }, // assetId, cardId
    //     //       { "prim": "Pair", "args": [ { "int": "2" }, { "prim": "Pair", "args": [ { "int": "3" }, { "int": "12" } ] } ] } // dice1, dice2, newPosition
    //     //     ]
    //     //   },
    //     data: data,
    //     type: GameContract.payloadFormat,
    // }).then((data) => {
    //     const thingsToSign3 = Buffer.from(data.packed, 'hex');
    //     tezosService.make_signature(thingsToSign3, keyStore.privateKey).then(signature => {
    //         console.log('payload', JSON.stringify(payload3));
    //         console.log('thingsToSign', JSON.stringify(thingsToSign3));
    //         console.log('signature', signature);
    //     }).catch(err => {
    //         console.error(err);
    //     })
    
    // }).catch(err => {
    //     console.error(err);
    // })
    // try {
    //     const payload3 = (await rpcClient.packData({
    //         data: { string: 'test' },
    //         type: { prim: 'string' },
    //     })).packed;
    //     const thingsToSign3 = Buffer.from(payload3);
    //     await tezosService.make_signature(thingsToSign3, keyStore.privateKey).then(signature => {
    //         console.log('payload', JSON.stringify(payload3));
    //         console.log('thingsToSign', JSON.stringify(thingsToSign3));
    //         console.log('signature', signature);
    //     })
    // } catch(err) {
    //     console.error(err);
    // }
    
    
    if (testAssetContract) {
        if (redeploy_assets) {
            await AssetsContract.deploy(keyStore, originator, originator, allAssets)
            .then(assetsContract => {
                console.log('Assets contract deployed at ', assetsContract.address);
                assetsContractAddress = assetsContract.address;
            }).catch(err => {
                throw new Error('Error when deploying Assets contract:' + err);
            })
        }
        const assetsContract = await AssetsContract.retrieve(assetsContractAddress);
        let resetPromise = undefined;
        await assetsContract.reset(keyStore).then((txOper) => {
            resetPromise = txOper.onConfirmed;
        }).catch(err => {
            throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
        });
        await (resetPromise as any).then((blockId:  number) => {
            console.log('Reset Tx confirmed', blockId);
        }).catch((err: any) => {
            throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
        });
    }
    if (testGameContract) {
        if (redeploy_game) {
            await GameContract.deploy(keyStore, 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki')
            .then(gameContract => {
                console.log('Game contract deployed at ', gameContract.address);
                gameContractAddress = gameContract.address;
            }).catch(err => {
                throw new Error('Error when deploying game contract:' + err);
            });
        }
        if (redeploy_assets) {
            await AssetsContract.deploy(keyStore, originator, gameContractAddress, allAssets)
            .then(assetsContract => {
                console.log('Assets contract deployed at ', assetsContract.address);
                assetsContractAddress = assetsContract.address;
            }).catch(err => {
                throw new Error('Error when deploying Assets contract:' + err);
            })
        }
        if (redeploy_token) {
            await TokenContract.deploy(keyStore, gameContractAddress)
            .then(tokenContract => {
                console.log('Token contract deployed at ', tokenContract.address);
                tokenContractAddress = tokenContract.address;
            }).catch(err => {
                throw new Error('Error when deploying Token contract:' + err);
            })
        }
        if (redeploy_chances) {
            await ChanceContract.deploy(keyStore, keyStore.publicKeyHash, gameContractAddress, allChances)
            .then(chanceContract => {
                console.log('Chance contract deployed at ', chanceContract.address);
                chanceContractAddress = chanceContract.address;
            }).catch(err => {
                throw new Error('Error when deploying Chance contract:' + err);
            });
        }

        const keyStoreAlice = await tezosService.getAccount('tz1ePDRmZSsfULRxNJD7Skiwc3AmLjwDYbb8');
        const keyStoreBob = await tezosService.getAccount('tz1fQnrGvwHXh9YrkrjY6VwcHpfqWm3i8bdB');
        const gameContract = await GameContract.retrieve(gameContractAddress);
        gameContract.update().then(async (gameStorage) => {
            if (gameStorage.status === 'started' && reset_game) {
                let resetPromise = undefined;
                await gameContract.reset(keyStore).then((operation) => {
                    console.log('returns from reset call:' + operation.txHash);
                    resetPromise = operation.onConfirmed;
                }).catch(err => {
                    throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
                });
                await (resetPromise as any).then((blockId:  number) => {
                    console.log('Reset Tx confirmed', blockId);
                }).catch((err: any) => {
                    throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
                });
                await gameContract.update().then((storage) => {
                    gameStorage = storage;
                })
            }
            if (gameStorage.status === 'created') {
                if (!gameStorage.playersSet.includes(keyStoreAlice.publicKeyHash)) {
                    console.log('game storage:', JSON.stringify(gameStorage));
                    let aliceRegisterPromise = undefined;
                    await gameContract.register(keyStoreAlice).then((operation) => {
                        console.log('returns from register call:' + operation.txHash);
                        aliceRegisterPromise = operation.onConfirmed;
                    }).catch(err => {
                        throw new Error(`Error during register Alice call: ${err.id}, ${err.message}`);
                    });
                    await (aliceRegisterPromise as any).then((blockId: number) => {
                        console.log('register Alice Tx confirmed', blockId);
                    }).catch((err: any) => console.error('register Alice tx failed:' + err))
                } else {
                    console.log("Alice is already registered");
                }
                if (!gameStorage.playersSet.includes(keyStoreBob.publicKeyHash)) {
                    let bobRegisterPromise = undefined;
                    console.log('game storage:', JSON.stringify(gameStorage));
                    await gameContract.register(keyStoreBob).then((operation) => {
                        console.log('returns from register call:' + operation.txHash);
                        bobRegisterPromise = operation.onConfirmed;
                    }).catch(err => {
                        throw new Error(`Error during register Bob call: ${err.id}, ${err.message}`);
                    });
                    await (bobRegisterPromise as any).then((blockId: number) => {
                        console.log('register Bob Tx confirmed', blockId);
                    }).catch((err: any) => console.error('register Bob tx failed:' + err))

                } else {
                    console.log("Bob is already registered");
                }
                let startPromise = undefined;
                await gameContract.start(keyStore, tokenContractAddress, chanceContractAddress, chanceContractAddress, assetsContractAddress, 1500).then((operation) => {
                    console.log('returns from start call:' + operation.txHash);
                    startPromise = operation.onConfirmed;
                }).catch(err => {
                    throw new Error(`Error during start call: ${err.id}, ${err.message}`);
                });
                await (startPromise as any).then((blockId:  number) => {
                    console.log('start Tx confirmed', blockId);
                }).catch((err: any) => {
                    throw new Error(`Error during start call: ${err.id}, ${err.message}`);
                });
                await gameContract.update().then((storage) => {
                    gameStorage = storage;
                });
            }
            const assetsContract = await AssetsContract.retrieve(assetsContractAddress);
            const portfolioAlice = assetsContract.storage?.portfolio.get(keyStoreAlice.publicKeyHash);
            for (let assetId of [0, 4]) {
                if (!portfolioAlice || !portfolioAlice.map(bn => bn.toNumber()).includes(assetId)) {
                    // let buyPromise = undefined;
                    // await assetsContract.buy(keyStore, assetId, keyStoreAlice.publicKeyHash).then((operation) => {
                    //     console.log('returns from Alice buy assetId:' + assetId + ' call:' + operation.txHash);
                    //     buyPromise = operation.onConfirmed;
                    // }).catch(err => {
                    //     throw new Error(`Error during Alice buy  assetId:' + assetId + 'call: ${err.id}, ${err.message}`);
                    // });
                    // await (buyPromise as any).then((blockId: number) => {
                    //     console.log('Alice buy  assetId:' + assetId + 'Tx confirmed', blockId);
                    // }).catch((err: any) => console.error('Alice buy  assetId:' + assetId + 'tx failed:' + err))
                }
            }
            const portfolioBob = assetsContract.storage?.portfolio.get(keyStoreBob.publicKeyHash);
            for (let assetId of [4]) {
                if (!portfolioBob || !portfolioBob.map(bn => bn.toNumber()).includes(assetId)) {
                    // let buyPromise = undefined;
                    // await assetsContract.buy(keyStore, assetId, keyStoreBob.publicKeyHash).then((operation) => {
                    //     console.log('returns from Bob buy assetId:' + assetId + ' call:' + operation.txHash);
                    //     buyPromise = operation.onConfirmed;
                    // }).catch(err => {
                    //     throw new Error(`Error during Bob buy  assetId:' + assetId + 'call: ${err.id}, ${err.message}`);
                    // });
                    // await (buyPromise as any).then((blockId: number) => {
                    //     console.log('Bob buy  assetId:' + assetId + 'Tx confirmed', blockId);
                    // }).catch((err: any) => console.error('Bob buy  assetId:' + assetId + 'tx failed:' + err))
                }
            }
            if (reset_game) {
                let resetPromise = undefined;
                await gameContract.reset(keyStore).then((operation) => {
                    console.log('returns from reset call:' + operation.txHash);
                    resetPromise = operation.onConfirmed;
                }).catch(err => {
                    throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
                });
                await (resetPromise as any).then((blockId:  number) => {
                    console.log('Reset Tx confirmed', blockId);
                }).catch((err: any) => {
                    throw new Error(`Error during reset call: ${err.id}, ${err.message}`);
                });
            }
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

