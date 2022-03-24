import * as msal from '@azure/msal-node';
import open from 'open';
import express from 'express';
import path from 'path'
import {
    DataProtectionScope,
    Environment,
    PersistenceCreator,
    PersistenceCachePlugin,
} from "@azure/msal-node-extensions";

import { AppConfig } from "../documents/appConfig";
import axios from 'axios';
import https from 'https';
import e from 'express';

var _challengeMethod = 'S256'
var _verifier: any;
var _redirectUri = "http://localhost:20221/login";
var _authority = "https://teamhitorib2c.b2clogin.com/teamhitorib2c.onmicrosoft.com/B2C_1_signupsignin";
var _scopes = [
    "offline_access",
    "https://teamhitorib2c.onmicrosoft.com/edit/Edit"
];

export async function clearCache() {

    console.log("Clear token cache called");
    var pca = await getPublicClientApplication();
    var msalTokenCache = pca.getTokenCache();
    var accounts = await msalTokenCache.getAllAccounts();

    console.log(`Found ${accounts.length} accounts`);

    for (var account of accounts) {
        console.log("Removing account", account);
        await pca.getTokenCache().removeAccount(account)
    }

    console.log("Token cache cleared")
}

export async function getAccessToken(): Promise<string | undefined> {

    try {

        var tryGetToken = async () => {
            try {
                var pca = await getPublicClientApplication();

                const msalTokenCache = pca.getTokenCache();
                // Retrieve all cached accounts
                const accounts = await msalTokenCache.getAllAccounts();

                if (accounts.length > 0) {
                    const account = accounts[0];

                    var token = await pca.acquireTokenSilent({
                        scopes: _scopes, account: account
                    })

                    return token?.accessToken;
                }
            } catch (error) {
                console.log("no token errorr")
            }

            return null;
        }

        console.log("Lets try and get a token");

        var token = await tryGetToken();

        if (token) return token;

        console.log("Could not get token from cache, let try and login..")
        await login();

        token = await tryGetToken();

        if (token) return token;
        console.log("still no token after login, hmm...")


    } catch (error) {
        console.log(error);
    }

    return undefined;
}

export async function getPublicClientApplication(): Promise<msal.PublicClientApplication> {

    const cachePath = path.join(Environment.getUserRootDirectory(), "./cache.json");

    const persistenceConfiguration = {
        cachePath,
        dataProtectionScope: DataProtectionScope.CurrentUser,
        serviceName: "<SERVICE-NAME>",
        accountName: "<ACCOUNT-NAME>",
        usePlaintextFileOnLinux: false,
    }

    return PersistenceCreator
        .createPersistence(persistenceConfiguration)
        .then(async (persistence) => {
            const publicClientConfig = {
                auth: {
                    clientId: '42665dab-afb7-40b9-99a1-58cc011763e1',
                    authority: "https://teamhitorib2c.b2clogin.com/teamhitorib2c.onmicrosoft.com/B2C_1_signupsignin",
                    knownAuthorities: ["teamhitorib2c.b2clogin.com"],
                    redirectUri: _redirectUri,
                },

                // This hooks up the cross-platform cache into MSAL
                cache: {
                    cachePlugin: new PersistenceCachePlugin(persistence)
                },
                system: {
                    loggerOptions: {
                        loggerCallback(loglevel: any, message: any, containsPii: any) {
                            console.log(message);
                        },
                        piiLoggingEnabled: false,
                        logLevel: msal.LogLevel.Verbose,
                    }
                }
            };

            const pca = new msal.PublicClientApplication(publicClientConfig);

            return pca;
        });
}

export async function login(): Promise<boolean> {

    var pca = await getPublicClientApplication();

    return new Promise((resolve, reject) => {

        // express
        const app = express();
        var server = app.listen(20221);

        app.get("/login", (req, res) => {
            var tokenRequest = <msal.AuthorizationCodeRequest>{
                scopes: _scopes,
                code: req.query.code,
                redirectUri: _redirectUri,
                codeVerifier: _verifier
            }

            pca.acquireTokenByCode(tokenRequest)
                .then((response) => {
                    //console.log(response);
                    res.write("Login Successful. Please close this window and return to application..");

                    resolve(true);

                }).catch((error) => {
                    res.status(500).send(error);
                    resolve(false);
                }).finally(() => {
                    res.end(); //end the response
                    console.log("closing server");
                    server.close();
                });

            //console.log(req); //write a response to the client 
        });
        // eo express


        // Initialize CryptoProvider instance
        const cryptoProvider = new msal.CryptoProvider();
        // Generate PKCE Codes before starting the authorization flow
        cryptoProvider.generatePkceCodes()
            .then(({ verifier, challenge }) => {

                // Set generated PKCE Codes as session vars
                _verifier = verifier;

                console.log({ verifier, challenge });

                var authCodeRequest = <msal.AuthorizationUrlRequest>{
                    redirectUri: _redirectUri,
                    authority: _authority,
                    scopes: _scopes,
                    // Add PKCE code challenge and challenge method to authCodeUrl request object
                    codeChallenge: challenge,
                    codeChallengeMethod: _challengeMethod,
                    state: "xxx"
                }

                // Get url to sign user in and consent to scopes needed for application
                // Get url to sign user in and consent to scopes needed for application
                pca.getAuthCodeUrl(authCodeRequest).then(async (response) => {
                    await open(`${response}`);
                    console.log(response);
                }).catch((error) => {
                    console.log(JSON.stringify(error));
                    resolve(false);
                });
            });
    });
}