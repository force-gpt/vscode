import { ExtensionContext, window, ProgressLocation, Uri } from 'vscode';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs';
import * as path from 'path';

import utils from '../utils';


/**
 * Modify a Lightning Web Component from a request.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {Uri} uri - URI to the opened from file.
 */
const execute = async (context: ExtensionContext, uri: Uri): Promise<void> => {

	try {

		const modificationRequest = await window.showInputBox({
			title: 'Modification request',
			placeHolder: 'Specify the modification to be done to the code...',
			ignoreFocusOut: true
		});

		if(!modificationRequest) {
			throw new Error('USER_ABORT');
		}
		
		await window.withProgress({
			title: 'ForceGPT: Modifying code...',
			location: ProgressLocation.Notification
		}, async () => {

			// Get code from the clicked on file or else from open editor file
			const commandTargetPath = uri?.fsPath ?? window.activeTextEditor?.document.uri.fsPath;
			const parsedPath = path.parse(commandTargetPath);

			let lwcFolderPath;
			let lwcName;

			if(path.basename(parsedPath.dir) === 'lwc') {	// The component folder
				lwcFolderPath = commandTargetPath;
				lwcName = parsedPath.base;				
			} else {										// File or folder in the component folder
				lwcFolderPath = parsedPath.dir;
				lwcName = path.basename(lwcFolderPath);
			}

			let requestBody: { [key: string]: Object } = { request: modificationRequest };
			
			const lwcFileBasePath = path.join(lwcFolderPath, lwcName);
			if(existsSync(lwcFileBasePath + '.html')) { requestBody.html = readFileSync(lwcFileBasePath + '.html', 'utf8');}
			if(existsSync(lwcFileBasePath + '.css')) { requestBody.css = readFileSync(lwcFileBasePath + '.css', 'utf8'); }
			if(existsSync(lwcFileBasePath + '.js')) { requestBody.js = readFileSync(lwcFileBasePath + '.js', 'utf8'); }
			if(existsSync(lwcFileBasePath + '.js-meta.xml')) { requestBody.meta = readFileSync(lwcFileBasePath + '.js-meta.xml', 'utf8'); }


			// Get context for the request from the project's metadata
			const metadataContext = utils.getMetadataContext(context);
			requestBody.context = { metadata: metadataContext };

			const modificationResponse = await utils.sendApiRequest(
				context,
				'POST',
				'/assistant/modify/lwc',
				{
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'Content-Type': 'application/json'
				},
				requestBody
			);
			
			if(modificationResponse?.responseBody?.success) {

				const newLwcName = modificationResponse.responseBody.content.name;
				const newLwcCode = modificationResponse.responseBody.content.code.lwc;
				
				// Modify the Lightning Web Component
				if(newLwcCode.html) { writeFileSync(lwcFileBasePath + '.html', newLwcCode.html); }
				if(newLwcCode.css) { writeFileSync(lwcFileBasePath + '.css', newLwcCode.css); }
				if(newLwcCode.js) { writeFileSync(lwcFileBasePath + '.js', newLwcCode.js); }
				if(newLwcCode.meta) { writeFileSync(lwcFileBasePath + '.js-meta.xml', newLwcCode.meta); }

				// Modify the LWC name if necessary
				if(newLwcName !== lwcName) {
					
					try {

						// Rename LWC files
						const newAuxLwcFileBasePath = path.join(lwcFolderPath, newLwcName);

						if(newLwcCode.html) { renameSync(lwcFileBasePath + '.html', newAuxLwcFileBasePath + '.html'); }
						if(newLwcCode.css) { renameSync(lwcFileBasePath + '.css', newAuxLwcFileBasePath + '.css'); }
						if(newLwcCode.js) { renameSync(lwcFileBasePath + '.js', newAuxLwcFileBasePath + '.js'); }
						if(newLwcCode.meta) { renameSync(lwcFileBasePath + '.js-meta.xml', newAuxLwcFileBasePath + '.js-meta.xml'); }

						// Rename LWC folder
						const newLwcFolderPath = path.join(path.dirname(lwcFolderPath), newLwcName);

						renameSync(lwcFolderPath, newLwcFolderPath);

					} catch(error: any) {
						console.warn(`Could not rename files: ${error.message}`);
					}

				}

				window.showInformationMessage(`ForceGPT: Lightning Web Component "${lwcName}" modified successfully.`);


			} else if(modificationResponse?.responseBody?.code !== 'unauthorized') {
				window.showErrorMessage(modificationResponse?.responseBody?.message ?? `Callout error`);
			}

		});

	} catch(error: any) {
		if(error.message === 'USER_ABORT') {
			console.info('Cancelled by user.');
		} else {
			console.error(error);
			window.showErrorMessage(error.message);
		}
	}

};


export default {
	execute
};