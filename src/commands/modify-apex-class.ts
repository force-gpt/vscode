import { ExtensionContext, window, ProgressLocation, Uri } from 'vscode';
import { readFileSync, renameSync, writeFileSync } from 'fs';
import * as path from 'path';

import utils from '../utils';


/**
 * Modify an Apex class from a request.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {Uri} uri - URI to the opened from file.
 */
const execute = async (context: ExtensionContext, uri: Uri): Promise<void> => {

	try {

		let newClassPath;

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
			const apexClassPath = uri?.fsPath ?? window.activeTextEditor?.document.uri.fsPath;
			const apexClassCode = readFileSync(apexClassPath, "utf8");

			const modificationResponse = await utils.sendApiRequest(
				context,
				'POST',
				'/assistant/modify/apex-class',
				{
					'Content-Type': 'application/json'
				},
				{
					request: modificationRequest,
					apexClass: apexClassCode
				}
			);
			
			if(modificationResponse?.responseBody?.success) {

				const apexClassName = modificationResponse.responseBody.content.name;
				const apexClassCode = modificationResponse.responseBody.content.code;
				
				// Modify the Apex class
				writeFileSync(apexClassPath, apexClassCode);

				// Modify the class name if necessary
				const oldClassName = path.basename(apexClassPath).slice(0, -4);
				if(apexClassName !== oldClassName) {
					const classDirPath = path.dirname(apexClassPath);
					const newClassPath = path.join(classDirPath, apexClassName + '.cls');
					const oldClassMetaPath = path.join(classDirPath, oldClassName + '.cls-meta.xml');
					const newClassMetaPath = path.join(classDirPath, apexClassName + '.cls-meta.xml');
					renameSync(apexClassPath, newClassPath);
					renameSync(oldClassMetaPath, newClassMetaPath);
				}

				window.showInformationMessage(`ForceGPT: Apex Class "${apexClassName}" modified successfully.`);


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