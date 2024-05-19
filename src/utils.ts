import { execSync } from 'child_process';
import fetch, { FetchError, Response } from 'node-fetch';
import path = require('path');
import { readFileSync, writeFileSync, existsSync, lstatSync, readdirSync, mkdirSync } from 'fs';
import { XMLParser } from 'fast-xml-parser';

import { ExtensionContext, Uri, commands, env, window, workspace } from 'vscode';


const SERVER_URI = process.env.SERVER_URI ?? 'https://app.force-gpt.com';
const AUTH_OPTION_RESET = `Reset credentials`;
const AUTH_OPTION_WEB = `Go to ForceGPT`;
const FETCH_TRIES = 3;
const PROJECT_PATH = (workspace.workspaceFolders ?? [])[0].uri.fsPath;


/**
 * Send an API request to the ForceGPT API.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} method - HTTP method.
 * @param {string} apiResource - API resource.
 * @param {Record<string, string> | undefined} headers - API request headers.
 * @param {Object | undefined} body - API request body.
 * @returns {Promise<any | undefined>} The API HTTP response and body.
 */
const sendApiRequest = async (context: ExtensionContext, method: string, apiResource: string, headers?: Record<string, string> | undefined, body?: Object | undefined): Promise<any | undefined> => {
	
	const credentials = await getCredentials(context);
	let invalidCredentials = !credentials;
	let response : any;

	if(credentials) {

		const authToken = Buffer.from(`${credentials.username}:${credentials.apiKey}`).toString('base64');

		const resource = apiResource.startsWith('/') ? apiResource.substring(1) : apiResource;

		response = await handledFetch(
			`${SERVER_URI}/api/${resource}`,
			{
				method: method,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { 'Authorization': `Basic ${authToken}`, ...headers },
				body: JSON.stringify(body)
			}
		);

		console.log(response);
		
		if(response?.responseBody?.code === 'unauthorized') {
			invalidCredentials = true;
		}

	}

	if(invalidCredentials) {
		window.showErrorMessage(`Set a valid combination of ForceGPT credentials. You can signup or get an API key at app.force-gpt.com`, AUTH_OPTION_WEB, AUTH_OPTION_RESET)
			.then(selection => {
				if(selection === AUTH_OPTION_WEB) {

					env.openExternal(Uri.parse('https://app.force-gpt.com'));

				} else if(selection === AUTH_OPTION_RESET) {

					commands.executeCommand('force-gpt.setCredentials');

				}
			});
	}

	return response;
	
};

/**
 * Get ForceGPT credentials from the extension context. If they are not set, ask the user to set them.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<any>} The ForceGPT credentials.
 */
const getCredentials = async (context: ExtensionContext): Promise<any> => {

	let result;

	let username = await context.secrets.get('force-gpt.username');
	let apiKey = await context.secrets.get('force-gpt.api-key');

	if(username && apiKey) {

		result = {
			username: username,
			apiKey: apiKey
		};

	} else {
		result = await setCredentials(context);
	}

	return result;

};

/**
 * Set ForceGPT credentials in the extension context.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<Object | undefined>} The ForceGPT credentials.
 */
const setCredentials = async (context: ExtensionContext): Promise<Object | undefined> => {

	let result;

	const username = await window.showInputBox({
		title: 'ForceGPT Username',
		placeHolder: 'Enter your username...',
		prompt: 'If you still don\'t have a user, signup at https://app.force-gpt.com.',
		ignoreFocusOut: true
	});

	if(username) {

		const apiKey = await window.showInputBox({
			title: 'ForceGPT API Key',
			placeHolder: 'Enter your API key...',
			prompt: 'API keys are created in the Integration tab at the ForceGPT web Dashboard.',
			ignoreFocusOut: true
		});

		if(apiKey) {
			await context.secrets.store('force-gpt.username', username);
			await context.secrets.store('force-gpt.api-key', apiKey);

			result = {
				username: username,
				apiKey: apiKey
			};
		}

	}

	return result;

};

/**
 * Erase stored ForceGPT credentials from the extension context.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const eraseCredentials = (context: ExtensionContext): void => {

	window.showWarningMessage('Are you sure you want to erase your stored ForceGPT credentials?', 'Yes', 'No').then((choice) => {
        if(choice === 'Yes') {
			context.secrets.delete('force-gpt.username');
			context.secrets.delete('force-gpt.api-key');
		}
    });

};

/**
 * Collect the sf project's metadata context to ground a request.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const getMetadataContext = (context: ExtensionContext): Object => {
	
	const sfDefaultPath = getSfDefaultPath();
	const objectFolderPath = path.join(sfDefaultPath, 'main', 'default', 'objects');

	let objectMetadata: any[] = [];

	if(existsSync(objectFolderPath)) {

		const parser = new XMLParser();

		readdirSync(objectFolderPath).forEach((objectName) => {
			try {

				const objectPath = path.join(objectFolderPath, objectName);

				if(lstatSync(objectPath).isDirectory()) {
				
					const object: any = {
						name: objectName
					};

					// Get meta information
					const objectMeta = readFileSync(path.join(objectPath, objectName + '.object-meta.xml'));
					const parsedObjectMeta = parser.parse(objectMeta).CustomObject;

					if(parsedObjectMeta.description) {
						object.description = parsedObjectMeta.description;
					}

					// Get fields information
					const fieldsFolderPath = path.join(objectPath, 'fields');
					if(existsSync(fieldsFolderPath)) {
						readdirSync(fieldsFolderPath).forEach((fieldFile) => {

							try {

								if(!object.fields) {
									object.fields = [];
								}

								// Get meta information
								const fieldMeta = readFileSync(path.join(fieldsFolderPath, fieldFile));
								const parsedFieldMeta = parser.parse(fieldMeta).CustomField;
								const field: any = {
									name: parsedFieldMeta.fullName,
									label: parsedFieldMeta.label,
									description: parsedFieldMeta.description,
									type: parsedFieldMeta.type
								};
								if(parsedFieldMeta.length) { field.length = parseInt(parsedFieldMeta.length); }
								if(parsedFieldMeta.required === 'true') { field.required = true; }
								if(parsedFieldMeta.externalId === 'true') { field.externalId = true; }
								if(parsedFieldMeta.referenceTo) { field.referenceTo = parsedFieldMeta.referenceTo; }
								if(parsedFieldMeta.relationshipName) { field.relationshipName = parsedFieldMeta.relationshipName; }
								if(parsedFieldMeta.type === 'Picklist' && parsedFieldMeta.valueSet) {
									field.picklistValues = parsedFieldMeta.valueSet.valueSetDefinition.value.map((value: any) => ({ fullName: value.fullName, label: value.label }));
								}

								object.fields.push(field);
							
							} catch(error) {
								console.warn(`Object field not processable: ${objectName}/${fieldFile}`);
								console.warn(error);
							}

						});
					}

					// Get record type information
					const rtFolderPath = path.join(objectPath, 'recordTypes');
					if(existsSync(rtFolderPath)) {
						readdirSync(rtFolderPath).forEach((rtFile) => {

							try {

								if(!object.recordTypes) {
									object.recordTypes = [];
								}

								// Get meta information
								const rtMeta = readFileSync(path.join(rtFolderPath, rtFile));
								const parsedRtMeta = parser.parse(rtMeta).RecordType;
								const recordType: any = {
									name: parsedRtMeta.fullName,
									label: parsedRtMeta.label,
									description: parsedRtMeta.description,
									active: parsedRtMeta.active
								};
								if(parsedRtMeta.picklistValues) {
									recordType.picklistValues = parsedRtMeta.picklistValues.map((plField: any) => ({
										field: plField.picklist,
										values: plField.values.map((plv: any) => plv.fullName) })
									);
								}

								object.recordTypes.push(recordType);
								
							} catch(error) {
								console.warn(`Object record type not processable: ${objectName}/${rtFile}`);
								console.warn(error);
							}

						});
					}

					objectMetadata.push(object);
				
				}

			} catch(error) {
				console.warn(`Object folder not processable: ${objectName}`);
				console.warn(error);
			}
		});
	}

	let metadataContext: any = {};

	if(objectMetadata.length > 0) {
		metadataContext.objectMetadata = objectMetadata;
	}

	return metadataContext;

};

/**
 * Create an Apex class using the Salesforce CLI.
 * @param {string} apexClassName - Apex class name.
 * @param {string} apexClassCode - Apex class code.
 * @param {string?} classFolderPath - Apex class folder path.
 * @returns {Promise<string>} The new Apex class file path.
 */
const createApexClass = async (apexClassName: string, apexClassCode: string, classFolderPath?: string): Promise<string> => {

	// Get the Salesforce CLI version command
	const sfCliVersion = getSfCliVersion();

	// If the class folder is not set or does not exist, create it
	if(!classFolderPath) {

		const sfDefaultPath = getSfDefaultPath();

		classFolderPath = path.join(sfDefaultPath, 'main', 'default', 'classes');

		// Create Apex class folder if it does not exist
		if(!existsSync(classFolderPath)) {
			mkdirSync(classFolderPath, { recursive: true });
		}

	}

	// If the file already exists, ask the user if they want to overwrite it
	const classFilePath = path.join(classFolderPath, apexClassName + '.cls');

	if(existsSync(classFilePath)) {

		const overwrite = await window.showWarningMessage('The Apex class already exists. Do you want to overwrite it?', 'Yes', 'No');

		if(overwrite !== 'Yes') {
			throw new Error('USER_ABORT');
		}

	}

	// Create the Apex class
	if(sfCliVersion === 'sf') {
		execSync(`sf apex generate class -d ${classFolderPath} -n ${apexClassName}`);
	} else if(sfCliVersion === 'sfdx') {
		execSync(`sfdx force:apex:class:create -d ${classFolderPath} -n ${apexClassName}`);
	} else {
		throw new Error('The Salesforce CLI version could not be identified.');
	}

	// Fill the Apex class with the generated code
	writeFileSync(classFilePath, apexClassCode);

	return classFilePath;

};

/**
 * Create a Lightning Web Component using the Salesforce CLI.
 * @param {string} newLwcName - Component name.
 * @param {any} newLwcCode - Component code.
 * @returns {Promise<string>} The new component HTML file path.
 */
const createLwc = async (newLwcName: string, newLwcCode: any): Promise<string> => {

	// Get the Salesforce CLI version command
	const sfCliVersion = getSfCliVersion();
	const sfDefaultPath = getSfDefaultPath();

	const lwcFolderPath = path.join(sfDefaultPath, 'main', 'default', 'lwc');

	// Create LWC folder if it does not exist
	if(!existsSync(lwcFolderPath)) {
		mkdirSync(lwcFolderPath, { recursive: true });
	}

	// If the new LWC folder already exists, ask the user if they want to overwrite it
	const newLwcFolderPath = path.join(lwcFolderPath, newLwcName);

	if(existsSync(newLwcFolderPath)) {

		const overwrite = await window.showWarningMessage('The Lightning Web Component already exists. Do you want to overwrite it?', 'Yes', 'No');

		if(overwrite !== 'Yes') {
			throw new Error('USER_ABORT');
		}

	}

	// Create the component
	if(sfCliVersion === 'sf') {
		execSync(`sf lightning generate component --type lwc -d ${lwcFolderPath} -n ${newLwcName}`);
	} else if(sfCliVersion === 'sfdx') {
		execSync(`sfdx force:lightning:component:create --type lwc -d ${lwcFolderPath} -n ${newLwcName}`);
	} else {
		throw new Error('The Salesforce CLI version could not be identified.');
	}

	// Fill the Lightning Web Component with the generated code
	const lwcFileBasePath = path.join(newLwcFolderPath, newLwcName);
	if(newLwcCode.html) { writeFileSync(lwcFileBasePath + '.html', newLwcCode.html); }
	if(newLwcCode.css) { writeFileSync(lwcFileBasePath + '.css', newLwcCode.css); }
	if(newLwcCode.js) { writeFileSync(lwcFileBasePath + '.js', newLwcCode.js); }
	if(newLwcCode.meta) { writeFileSync(lwcFileBasePath + '.js-meta.xml', newLwcCode.meta); }

	return lwcFileBasePath + '.html';

};


// ---------- AUX FUNCTIONS ----------

/**
 * Fetch with response and body handling.
 * @param {string} endpoint - API endpoint.
 * @param {Object} params - Fetch parameters.
 * @returns {Promise<{ responseBody: any; response: Response; } | undefined>} The fetch response and body.
 */
const handledFetch = async (endpoint: string, params: Object): Promise<{ responseBody: any; response: Response; } | undefined> => {

	let result;

	// Try a number of times if a Fetch error occurs
	for(let i=0; i<FETCH_TRIES && !result; i++) {
		try {
			result = await fetch(endpoint, params)
				.then(response => response.clone().json().catch(() => response.text())
				.then(responseBody => ({ responseBody: responseBody, response: response })));
		} catch(error) {
			console.warn(error);
			if(error instanceof FetchError && i < FETCH_TRIES-1) {
				console.warn(`Fetch error, trying again...`);
			} else {
				throw error;
			}
		}
	}

	return result;
		
};

/**
 * Get the Salesforce CLI version.
 * @returns {string} The Salesforce CLI version.
 */
const getSfCliVersion = (): string => {
	
	let result;

	try {
		execSync('sf -v');
		result = 'sf';
	} catch(error: any) {
		try {
			execSync('sfdx -v');
			result = 'sfdx';
		} catch(error: any) {
			throw new Error('The Salesforce CLI is not installed or is not in the PATH.');
		}
	}

	return result;

};


/**
 * Get the sf project root path.
 * @returns {string} The sf project root path.
 */
const getSfDefaultPath = (): string => {
	
	let result;
	
	if(existsSync('sfdx-project.json')) {
		try {
			result = JSON.parse(readFileSync('sfdx-project.json', 'utf8')).packageDirectories?.find((dir: any) => dir.default === true)?.path;
		} catch(error: any) {
			throw new Error('Error parsing sfdx-project.json.');
		}
	}
	
	if(!result) {
		throw new Error('The Salesforce default path could not be retrieved. Please check that you are in a Salesforce project root folder and that there is a sfdx-project.json file with a default package directory.');
	}

	// Convert the relative path to an absolute path
	const absoluteFilePath = path.join(PROJECT_PATH, result);

	return absoluteFilePath;

};


export default {
	sendApiRequest,
	getCredentials,
	setCredentials,
	eraseCredentials,
	getMetadataContext,
	createApexClass,
	createLwc
};