"use strict";

// # Inquirer.

const J = require('JSUS').JSUS;
const logger = require('./logger')();
const cfg = require('./config')();

const modules = require('./load-modules');
const api = require('./api');
const codes = require('./codes');

const colors = require('colors');

const inquirer = require('inquirer');


inquirer
  .prompt([
    /* Pass your questions in here */
  ])
  .then(answers => {
    // Use user feedback for... whatever!!
  });
