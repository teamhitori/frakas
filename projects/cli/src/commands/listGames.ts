import axios from "axios";
import { getAccessToken } from "./login";
import https from 'https';
import { Console } from "console";

export async function listGames() {

    const token = await getAccessToken();

    console.log("token", token)

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    var games = await axios.get('https://localhost:8001/api/editorApi/get-all', { headers: { Authorization: `Bearer ${token}` }, httpsAgent: agent })
        .then(function (response) {
            // handle success
            console.log(`Request Successful`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            console.log(`Error`, error);
        });

    if(!games.length) {
        console.log("You do not have any Games")
    } else {
        for (const game of games) {
            console.log(game);     
        }
    }
}