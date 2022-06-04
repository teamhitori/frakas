// theirs
import express from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'path'
import chalk from "chalk";

// mine
//import { AppConfig } from "../documents/appConfig";
import { args } from "../documents/args";
import { spawnBackend } from "../utils/runExt";
import { FrakasJson } from "@frakas/api/documents/FrakasJson";


export function up(appconfig: FrakasJson, root: string, argv: args) {

    spawnBackend(appconfig, root, argv, true);


}