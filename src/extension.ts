// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

import forceGptSignup from './commands/forcegpt-signup';
import setCredentials from './commands/set-credentials';
import eraseCredentials from './commands/erase-credentials';
import generateApexClass from './commands/generate-apex-class';
import modifyApexClass from './commands/modify-apex-class';
import generateApexTest from './commands/generate-apex-test';
import generateLwc from './commands/generate-lwc';
import modifyLwc from './commands/modify-lwc';

export function activate(context: vscode.ExtensionContext) {

    console.log('ForceGPT is now active');
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.forceGptSignup', () => {
		console.log('ForceGPT Command: forceGptSignup');
		forceGptSignup.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.setCredentials', async () => {
		console.log('ForceGPT Command: setCredentials');
		await setCredentials.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.eraseCredentials', async () => {
		console.log('ForceGPT Command: eraseCredentials');
		await eraseCredentials.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.generateApexClass', async () => {
		console.log('ForceGPT Command: generateApexClass');
		await generateApexClass.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.modifyApexClass', async (uri: vscode.Uri) => {
		console.log('ForceGPT Command: modifyApexClass');
		await modifyApexClass.execute(context, uri);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.generateApexTest', async (uri: vscode.Uri) => {
		console.log('ForceGPT Command: generateApexTest');
		await generateApexTest.execute(context, uri);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.generateLwc', async () => {
		console.log('ForceGPT Command: generateLwc');
		await generateLwc.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.modifyLwc', async (uri: vscode.Uri) => {
		console.log('ForceGPT Command: modifyLwc');
		await modifyLwc.execute(context, uri);
	}));

}

// This method is called when your extension is deactivated
// export function deactivate() {}
