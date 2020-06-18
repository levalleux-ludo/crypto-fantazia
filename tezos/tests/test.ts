import { tezosService } from "../src/tezos.service";
import { GameContract } from "../src/game.contract";
import { TezosNodeWriter, TezosParameterFormat } from "conseiljs";
import { Tezos } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';
import { originator } from "../src/token.service";
import { rejects } from "assert";

console.log("Hello Test");

const gameContractAddress = 'KT1KY4CLS1DsNafMNrWiFveqqFXfcgNrqcnQ';
const token = 'KT1NFSJXedkwz9miQeiYZpKymEY7k4rFeucL'
const gameCreator = 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki';

tezosService.getAccount(originator).then((keyStore) => {
    GameContract.retrieve(gameContractAddress).then(contract => {
        tezosService.parseContract(contract.address).then(async (entryPointsMap) => {
        // tezosService.invokeContract(keyStore, contract.address, 'testCallToken', ['"' + token + '"']).then(() => {
            // console.log('Invocation testCallToken Done');
            // tezosService.invokeContract(keyStore, contract.address, 'freeze', []).then(() => {
            //     console.log('Invocation start Done');
            // }).catch(err => console.error('Error invocation: ' + err));
        // }).catch(err => console.error('Error invocation testCallToken: ' + err));
        
            // TezosNodeWriter.sendContractInvocationOperation(
            //     tezosService.getNode(),
            //     keyStore,
            //     contract.address,
            //     0, // amount
            //     100000, // fee
            //     '', // derivationPath
            //     10, //storage_limit
            //     100000, // gas_limit
            //     'freeze',
            //     `[{ "prim": "unit" }]`,
            //     TezosParameterFormat.Micheline
            // ).then(() => {
            //     console.log("Invocation done");
            // }).catch(err => {
            //     console.error("Invocation error: " + err);
            // });

            // Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
            // await Tezos.contract.at(token).then(async (ci) => {
            //     try {
            //         await ci.methods.setAdministrator(contract.address).send().then((operation) => {
            //             console.log('returns from setAdministrator call:' + operation.hash);
            //             operation.confirmation(1).then((blockId) => {
            //                 console.log('Tx confirmed', operation.hash, blockId);
            //             }).catch(err => console.error('setAdministrator tx failed:' + err))
            //         }).catch(err => {
            //             console.error(`Error during testCallTokenAdminOnly call: ${err.id}, ${err.message}`);
            //         });
            //     } catch (err) {
            //         console.error('Error during setAdministrator call:' + JSON.stringify(err));
            //     }
            // });

            Tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(keyStore.privateKey) });

            // await new Promise((resolve, reject) => {
            //     contract.testCallToken(keyStore, token).then((txOper) => {
            //         console.log('returns from testCallToken call:' + txOper.txHash);
            //         txOper.onConfirmed.then((blockId) => {
            //             console.log('Tx confirmed', txOper.txHash, blockId);
            //             resolve();
            //         }).catch(err => {
            //             console.error('testCallToken tx failed:' + err);
            //             reject(err)
            //         });
            //     }).catch(err => {
            //         console.error('Error during testCallToken call:' + err);
            //         reject(err);
            //     });
            // });

            // await new Promise((resolve, reject) => {
            //     contract.testCallTokenAdminOnly(keyStore, token).then((txOper) => {
            //         console.log('returns from testCallTokenAdminOnly call:' + txOper.txHash);
            //         txOper.onConfirmed.then((blockId) => {
            //             console.log('Tx confirmed', txOper.txHash, blockId);
            //             resolve();
            //         }).catch(err => {
            //             console.error('testCallTokenAdminOnly tx failed:' + err);
            //             reject(err);
            //         });
            //     }).catch(err => {
            //         console.error(`Error during testCallTokenAdminOnly call: ${err.id}, ${err.message}`);
            //         reject(err)
            //     });
            // });

            await contract.update().then(storage => {
                console.log('status: ', storage.status);
            }).catch(err => console.error('Error during update:' + err));

            await new Promise((resolve, reject) => {
                contract.start(keyStore, token, '', '', '', 1500).then((txOper) => {
                    console.log('returns from start call:' + txOper.txHash);
                    txOper.onConfirmed.then((blockId) => {
                        console.log('Tx confirmed', txOper.txHash, blockId);
                        resolve();
                    }).catch(err => {
                        console.error('start tx failed:' + err);
                        reject(err);
                    });
                }).catch(err => {
                    console.error(`Error during start call: ${err.id}, ${err.message}`);
                    reject(err);
                });
            });

            await contract.update().then(storage => {
                console.log('status: ', storage.status);
            }).catch(err => console.error('Error during update:' + err));

        }).catch(err => console.error('Error retrieve contract: ' + err));
    }).catch(err => console.error('Error retrieve contract: ' + err));

}).catch(err => console.error('Error getAccount: ' + err));
