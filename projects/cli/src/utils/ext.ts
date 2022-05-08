export function isValidGameName(gameName: string) {
    var regex = "^(?!\d)[a-zA-Z\d]+(?: [a-zA-Z\d]+)*$"

    // validate input
    var match = gameName.match(regex);

    return gameName.length <= 30 && match;

}

export function fixGameName(gameName: string): string {
    // replace non alphanumeric with spaces
    gameName = gameName.replace(/([^a-zA-Z\d])/g, " ");

    //remove double space
    gameName = gameName.replace(/\s\s+/g, ' ');

    // trim
    gameName = gameName.trim();

    // remove trailing numbers
    gameName = gameName.replace(/(^[\d]*)/mg, "");

    return gameName;
}