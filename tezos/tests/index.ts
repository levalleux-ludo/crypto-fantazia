import { tezosService } from "../src/tezos.service";
import { originator, tokenService } from "../src/token.service";

import gameContract from '../contracts/game-contract.json';

console.log('Hello World!');

const gameStorage = 
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
const gameContractAddress = 'KT1BLuqcTJr2csiiZecpeEPmC9mHQh7hevN2';

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
                    JSON.stringify(gameContract),
                    JSON.stringify(gameStorage),
                    keyStore
                ).then(address => resolve2(address)
                ).catch(err => reject2(err));
            } else {
                resolve2(gameContractAddress);
            }
        }).then((address) => {
            tezosService.readContract(address).then((storage) => {
                console.log(`initial storage: ${JSON.stringify(storage)}`);
                tezosService.parseContract(address).then((entryPointsMap) => {

                    // const setNumGuestsEP = entryPointsMap.get('setNumGuests');
                    // const params = setNumGuestsEP?.generateInvocationPair('"christmas party"', 19);
                    // console.log('params', params?.parameters);
                    // tezosService.invokeContract(keyStore, address, params?.parameters, params?.entrypoint).then(() => {
                    tezosService.invokeContract(keyStore, address, 'setNumGuests', ['"easter"', 12]).then(() => {
                        console.log('The End !');
                        resolve();
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
            console.error(`[ERROR] deploy game contract failed with error:${err}`);
            resolve();
        });
    });
}).catch(err => {
    console.error('Originator Account initialization failed with error: ' + err);
});

