// import path from 'path'
const path = require('path');
const fs = require('fs');
const shell = require('shelljs');

import db from '../../../../data/db';
import {
  getSession
} from 'next-auth/client';

const userDirectory = path.join(process.cwd(), 'data/users');
const compositionsDirectory = path.join(userDirectory, 'compositions');

function getIfComposition(ifAction, successAction, failureAction) {
  return `module.exports = composer.if(
        composer.action('${ifAction.name}', 
        { 
            action: ${ifAction.definition} } 
        }),
        composer.action('${successAction.name}', 
        { 
            action: ${successAction.definition} } 
        }),
        composer.action('${failureAction.name}', 
        { 
            action: ${failureAction.definition} } 
      }))`;
}

function getSequenceComposition(action1, action2) {
  return `module.exports = composer.sequence(
        composer.action('${action1.name}', 
        { 
            action: ${action1.definition} } 
        }),
        composer.action('${action2.name}', 
        { 
            action: ${action2.definition} } 
        })
    )`;
}

async function ConvertAgnosticCompositionIntoJSCode(compositionName, user) {

  return await db.task((t) => {
    return t
      .one(
        'SELECT id FROM users WHERE name = $1',
        user,
        (a) => a.id
      )
      .then((userid) => {
        return t
          .one(
            `SELECT definition 
          FROM compositions
          WHERE name=$1 and userid=$2`,
            [compositionName, userid],
            ({
              definition
            }) => ({
              definition,
              userid
            })
          )
      })
      .then(async ({
        definition,
        userid
      }) => {
        const functions = await t
          .any(
            `SELECT id, name, description, definition 
          FROM functions
          WHERE userid=$1`,
            userid
          );
        return {
          definition: JSON.parse(definition),
          functions,
          userid
        }
      })
      .then(({
        definition,
        functions,
        userid
      }) => {
        const functionsObj = {};
        functions.forEach((element) => {
          functionsObj[element.id] = element;
        });
        let jsContent = "const composer = require('openwhisk-composer'); ";
        // if its an "If composition"
        if (definition.type == 'ifelse') {
          jsContent += getIfComposition({
            name: functionsObj[definition.func[0]].name,
            definition: functionsObj[definition.func[0]].definition,
          }, {
            name: functionsObj[definition.func[1]].name,
            definition: functionsObj[definition.func[1]].definition,
          }, {
            name: functionsObj[definition.func[2]].name,
            definition: functionsObj[definition.func[2]].definition,
          }, );
        } else if (definition.type == 'sequence') {
          jsContent += getSequenceComposition({
            name: functionsObj[definition.func[0]].name,
            definition: functionsObj[definition.func[0]].definition,
          }, {
            name: functionsObj[definition.func[1]].name,
            definition: functionsObj[definition.func[1]].definition,
          }, );
        }
        // if its an "sequence composition"
        // TODO: sequence code
        // Save the IBM specific JS into a file for later use
        const ibmCompositionJsfilePath = path.join(compositionsDirectory, `${compositionName}.js`);
        fs.writeFileSync(ibmCompositionJsfilePath, jsContent);
        return ibmCompositionJsfilePath;
      })
      .catch((error) => {
        console.log('ERROR: ', error);
        res.statusCode = 500;
        return res.send('Error in add-function: ', error);
      });
  });
}

export default async (req, res) => {
  const {
    query: {
      compositionName
    },
  } = req;
  const session = await getSession({
    req
  });
  // convert from agnostic to ibm specific JS composition representation
  const ibmCompositionJsfilePath = await ConvertAgnosticCompositionIntoJSCode(compositionName, session.user.name);

  // convert the JS into JSON IBM specific representation with the compose cmd line
  const ibmCompositionJsonfilePath = path.join(compositionsDirectory, `${compositionName}.json`);
  const cmd = `compose ${ibmCompositionJsfilePath} > ${ibmCompositionJsonfilePath}`;
  shell.exec(cmd, (code, stdout, stderr) => {
    console.log('ibmconvert Exit code:', code);
    console.log('ibmconvert target output:', stdout);
    console.log('ibmconvert target stderr:', stderr);
    // check code and stdout and stderr
    if (code !== 0) {
      res.statusCode = 500;
      res.send(stderr);
    } else {
      res.statusCode = 200;
      // return the converted file
      const convertedFileContent = fs.readFileSync(`${ibmCompositionJsonfilePath}`);
      res.json(convertedFileContent);
    }
  });
};