import { ExtensionContext, window, ProgressLocation, workspace, commands, Uri } from 'vscode';

import utils from '../utils';


/**
 * Generate a Lightning Web Component from a description.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const execute = async (context: ExtensionContext): Promise<void> => {

	try {

		const lwcDescription = await window.showInputBox({
			title: 'LWC description',
			placeHolder: 'Specify what the component should do...',
			prompt: 'Give as much detail as you can, such as the expected functionality, user interaction, api attributes or validations.',
			ignoreFocusOut: true
		});

		if(!lwcDescription) {
			throw new Error('USER_ABORT');
		}
		
		await window.withProgress({
			title: 'ForceGPT: Generating Lightning Web Component...',
			location: ProgressLocation.Notification
		}, async () => {

			const generationResponse = await utils.sendApiRequest(
				context,
				'POST',
				'/assistant/generate/lwc',
				{
					'Content-Type': 'application/json'
				},
				{
					request: lwcDescription
				}
			);
			
			if(generationResponse?.responseBody?.success) {

				// Lightning Web Component
				const newLwcName = generationResponse.responseBody.content.name;
				const newLwcCode = generationResponse.responseBody.content.code.lwc;
					
				// Create component with sf or sfdx CLI
				const newLwcPath = await utils.createLwc(newLwcName, newLwcCode);

				// Open and focus on the new file
				const lwcHtmlDocument = await workspace.openTextDocument(newLwcPath);
				await window.showTextDocument(lwcHtmlDocument, { preview: false });

				
				// Apex controller
				if(generationResponse.responseBody.content.code.apex) {

					const newLwcApexName = generationResponse.responseBody.content.code.apex.name;
					const newLwcApexCode = generationResponse.responseBody.content.code.apex.code;
					
					// Create Apex class with sf or sfdx CLI
					const newClassPath = await utils.createApexClass(newLwcApexName, newLwcApexCode);

					// Open the new file
					await workspace.openTextDocument(newClassPath);

				}

				window.showInformationMessage(`ForceGPT: Lightning Web Component "${newLwcName}" generated successfully.`);


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