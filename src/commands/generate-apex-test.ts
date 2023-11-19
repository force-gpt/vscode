import { ExtensionContext, window, Uri, ProgressLocation, workspace } from 'vscode';
import { readFileSync } from 'fs';
import * as path from 'path';

import utils from '../utils';


/**
 * Generate an Apex test class for another Apex class.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {Uri} uri - URI to the opened from file.
 */
const execute = async (context: ExtensionContext, uri: Uri): Promise<void> => {

	try {

		await window.withProgress({
			title: 'ForceGPT: Generating Apex Test Class...',
			location: ProgressLocation.Notification
		}, async () => {

			// Get Apex class file from clicked on file or else from open editor file
			const apexClassPath = uri?.fsPath ?? window.activeTextEditor?.document.uri.fsPath;
			const apexClassDirPath = path.dirname(apexClassPath);
			const apexClassCode = readFileSync(apexClassPath, 'utf8');
			
			const generationResponse = await utils.sendApiRequest(
				context,
				'POST',
				'/assistant/generate/apex-test',
				{
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'Content-Type': 'application/json'
				},
				{
					apexClass: apexClassCode
				}
			);
			
			if(generationResponse?.responseBody?.success) {

				const testClassName = generationResponse.responseBody.content.name;
				const testClassCode = generationResponse.responseBody.content.code;
				
				// Create Apex class with sf or sfdx CLI
				const testClassPath = await utils.createApexClass(testClassName, testClassCode, apexClassDirPath);

				// Open and focus on the new file
				const classDocument = await workspace.openTextDocument(testClassPath);
				await window.showTextDocument(classDocument, { preview: false });

				window.showInformationMessage(`ForceGPT: Apex Test Class "${testClassName}" generated successfully.`);

			} else if(generationResponse?.responseBody?.code !== 'unauthorized') {
				window.showErrorMessage(generationResponse?.responseBody?.message ?? `Callout error`);
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