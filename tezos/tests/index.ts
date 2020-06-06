import { tezosService } from "../src/tezos.service";
import { originator, tokenService } from "../src/token.service";

console.log('Hello World!');

tezosService.initAccount(originator).then(async ({keyStore, secret}) => {
    console.log('Originator Account is initialized:', keyStore);
    await new Promise((resolve, reject) => {
        tezosService.activateAccount(keyStore, secret).then(() => {
            console.log('Originator Account is activated');
            resolve();
        }).catch(err => {
            console.error(`[ERROR] activateAccount(${keyStore.publicKeyHash}) failed -> ${err}`);
            resolve();
        });   
    });
    await new Promise((resolve, reject) => {
        tezosService.revealAccount(keyStore).then((result) => {
            console.log('Account has been revealed', result);
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
    tokenService.createContract(keyStore).then((contractAddress) => {
        console.log(`deployed token at ${contractAddress} (${tokenService.groupId})`);
        tezosService.verifyDestination(contractAddress).then((result) => {
            console.log(`verify: ${result}`);
        }).catch(err => {
            console.error(`verifyDestination contractAddress=${contractAddress} failed with error:${err}`);
        });
    }).catch(err => {
        console.error(`createContract failed with error:${err}`);
    });
}).catch(err => {
    console.error('Originator Account initialization failed with error: ' + err);
});

