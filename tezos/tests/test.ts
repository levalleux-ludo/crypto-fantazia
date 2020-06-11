import { tezosService } from "../src/tezos.service";
import { GameContract } from "../src/game.contract";
import { TezosNodeWriter, TezosParameterFormat } from "conseiljs";
import { Tezos } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';

console.log("Hello Test");

const gameContractAddress = 'KT1SdLziqFiu2EbFcLhYnE36Etm9KQ8MqKpz';
const gameCreator = 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki';

tezosService.getAccount(gameCreator).then((keyStore) => {
    GameContract.retrieve(gameContractAddress).then(contract => {
        tezosService.parseContract(contract.address).then((entryPointsMap) => {
        // tezosService.invokeContract(keyStore, contract.address, 'setCreator', ['"' + gameCreator + '"']).then(() => {
            // console.log('Invocation setCreator Done');
            // tezosService.invokeContract(keyStore, contract.address, 'freeze', []).then(() => {
            //     console.log('Invocation start Done');
            // }).catch(err => console.error('Error invocation: ' + err));
        // }).catch(err => console.error('Error invocation: ' + err));
        
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
            Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
            Tezos.contract.at(contract.address).then((ci) => {
                try {
                    ci.methods.freeze(null).send().then((operation) => {
                        console.log('returns from freeze call');
                    }).catch(err => console.error('Error during freeze call' + err));
                } catch (err) {
                    console.error('Error during freeze call' + JSON.stringify(err));
                }
            });
        }).catch(err => console.error('Error retrieve contract: ' + err));
    }).catch(err => console.error('Error retrieve contract: ' + err));

}).catch(err => console.error('Error getAccount: ' + err));
