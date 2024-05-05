import { ExtensionContext, window, ProgressLocation, workspace, commands, Uri } from 'vscode';

import utils from '../utils';


/**
 * Generate an Apex class from a description.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const execute = async (context: ExtensionContext): Promise<void> => {

	try {

		let newClassPath;

		const classDescription = await window.showInputBox({
			title: 'Class description',
			placeHolder: 'Specify what the class should do...',
			prompt: 'Give as much detail as you can, such as the input and output format, the expected functionality, validations or exceptions to be thrown.',
			ignoreFocusOut: true
		});

		if(!classDescription) {
			throw new Error('USER_ABORT');
		}
		
		await window.withProgress({
			title: 'ForceGPT: Generating Apex Class...',
			location: ProgressLocation.Notification
		}, async () => {

			// Get context for the request from the project's metadata
			const metadataContext = utils.getMetadataContext(context);

			const generationResponse = await utils.sendApiRequest(
				context,
				'POST',
				'/assistant/generate/apex-class',
				{
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'Content-Type': 'application/json'
				},
				{
					request: classDescription,
					context: { metadata: metadataContext }
				}
			);
			
			if(generationResponse?.responseBody?.success) {

				const newClassName = generationResponse.responseBody.content.name;
				const newClassCode = generationResponse.responseBody.content.code;
				
				// Create Apex class with sf or sfdx CLI
				newClassPath = await utils.createApexClass(newClassName, newClassCode);

				// Open and focus on the new file
				const classDocument = await workspace.openTextDocument(newClassPath);
				await window.showTextDocument(classDocument, { preview: false });

				window.showInformationMessage(`ForceGPT: Apex Class "${newClassName}" generated successfully.`);


			} else if(generationResponse?.responseBody?.code !== 'unauthorized') {
				window.showErrorMessage(generationResponse?.responseBody?.message ?? `Callout error`);
			}

		});

		// Generate also Apex test
		if(newClassPath) {
			const generateTest = await window.showInformationMessage('Generate also the Apex test now?', 'Yes', 'No');
			if(generateTest === 'Yes') {
				commands.executeCommand('force-gpt.generateApexTest', Uri.file(newClassPath));
			}
		}

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