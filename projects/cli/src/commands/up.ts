// theirs
import express from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'path'
import chalk from "chalk";

// mine
import { AppConfig } from "../documents/appConfig";
import { args } from "../documents/args";
import { startWeb } from "../utils/webExt";
import { spawnBackend } from "../utils/runExt";


export function up(appconfig: AppConfig, root: string, argv: args) {

    spawnBackend(appconfig, root, argv);

    startWeb(appconfig, root, argv);

}