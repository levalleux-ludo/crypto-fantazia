import { tezosService } from "../src/tezos.service";
import { originator, tokenService } from "../src/token.service";

import sampleContract from '../contracts/sample-contract.json';
import { SampleContract } from "../src/sample.contract";

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

const redeploy = false;
const sampleContractAddress = 'KT1BLuqcTJr2csiiZecpeEPmC9mHQh7hevN2';

tezosService.initAccount(originator).then(async ({keyStore, secret}) => {
    console.log('Originator Account is initialized:', keyStore);
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

            const gameContract = new SampleContract('KT1UfWhmWx13Nvd7rECZUjs3oQNJfFRRmVRn');
            gameContract.update().then((gameStorage) => {
                console.log('game storage:', JSON.stringify(gameStorage));
            }).catch(err => {
                console.error(err)
            });
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
                                console.error('[ERROR] invoke game contract failed with error:' + err);
                                resolve();
                            })
                        }).catch(err => {
                            console.error('[ERROR] invoke game contract failed with error:' + err);
                            resolve();
                        })
                    }).catch(err => {
                        console.error('[ERROR] parse game contract failed with error:' + err);
                        resolve();
                    })
                }).catch(err => {
                    console.error('[ERROR] read game contract failed with error:' + err);
                    resolve();
                })
            }).catch(err => {
                console.error(err);
                throw err;
            });
            
        }).catch(err => {
            console.error(`[ERROR] deploy game contract failed with error:${err}`);
            resolve();
        });
    });
}).catch(err => {
    console.error('Originator Account initialization failed with error: ' + err);
});

