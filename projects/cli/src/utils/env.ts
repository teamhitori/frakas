export function isDebug(): boolean{

    return process.env.__frakas_debug == "true" ? true : false;
}

export function getWebRoot(){
    var root = process.env.__frakas_debug == "true" ? "https://localhost:8001" : "https://editor.frakas.net" ;

    if(process.env.__frakas_debug == "true"){
        console.log("looks like we're debugging!");
    } 

    return root
}

export function getStorageBase(){
    var root =  "https://hitorifrakasprod.blob.core.windows.net" ;

    if(process.env.__frakas_debug == "true"){
        console.log("looks like we're debugging!");
    } 

    return root
}
