import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
	ToolbarButton
} from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ICellModel, isCodeCellModel, ICodeCellModel } from "@jupyterlab/cells";

import { IOutputAreaModel } from "@jupyterlab/outputarea";

import { IObservableUndoableList, IObservableList, IObservableString } from "@jupyterlab/observables";

import { NotebookActions, NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class ButtonExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {

	dialog: HTMLDialogElement;

	dialogOpened: boolean;

	info: string;

	selectedCell: ICodeCellModel;

	lastOutput: string;

    monitorHTLM: HTMLDivElement;

	partitions: number;

	created: number;

	finished: number;

	createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
		// Create the toolbar button
		let monitorButton = new ToolbarButton({
			label: 'Monitor',
			onClick: () => this.openDialog(panel)
		});

		this.info = "Searching for a cell with PyRDF call...";
		this.dialogOpened = false;
		this.partitions = 0;
		this.created = 0;
		this.finished = 0;
        

		// Add the toolbar button to the notebook toolbar
		panel.toolbar.addItem('Monitor', monitorButton);

		// The ToolbarButton class implements `IDisposable`, so the
		// button *is* the extension for the purposes of this method.
		return monitorButton;
	}

	openDialog(panel: NotebookPanel): void {
		
		console.log("Opening dialog");
		
		if(!this.dialogOpened) {


			console.log("Opening...");
			this.dialog = document.createElement('dialog');
			this.dialog.id = 'dialog';
			this.dialog.innerHTML = 
			'<h1 id="dialog-info" style="font-family:Arial">' + this.info + '</h1>' +
			'<button type="button" id="close-button" style="position: absolute; right: 0; top: 0">X</button>';

			document.body.appendChild(this.dialog);

			document.getElementById('close-button').addEventListener("click", (e:Event) => this.closeDialog());


			this.dialog.show();
			this.dialogOpened = true;

			this.searchForCellWithAnnotation(panel);
		}
	}

	closeDialog(): void {

		console.log("Closing...");
		if(this.dialogOpened) {
			document.body.removeChild(document.getElementById('dialog'));
			this.dialogOpened = false;
		}
	}

	searchForCellWithAnnotation(panel: NotebookPanel): void {
		const notebook = panel.content;
		var cells = notebook.model.cells;
		for (let i = 0; i < cells.length; i++) {
			const cell = cells.get(i);
			if(cell.value.text.includes("#@monitor")) {
				if (!isCodeCellModel(cell)) {
					throw new Error("cell is not a code cell.");
				}
				this.selectedCell = cell;
				this.addListener();
				this.setInfo("Cell found");
                this.insertAWSMonitor();
				break;
			}
		}
		if(!this.selectedCell) {
			this.setInfo("No cell with annotation found");
		}
	}

    insertAWSMonitor(): void {
        var cellsFromDomModel = document.getElementsByClassName('lm-Widget p-Widget lm-Panel p-Panel jp-Cell-inputWrapper');

        let cellWithAnnotationFound = false;
        let cell = null;
        for(let i = 0; i < cellsFromDomModel.length && cellWithAnnotationFound == false; i++) {
            cell = cellsFromDomModel.item(i);
            const commentElementsInsideCell = cell.getElementsByClassName('cm-comment');
            console.log("Comment cell found");

            for(let j = 0; j < commentElementsInsideCell.length && cellWithAnnotationFound == false; j++) {
                if(commentElementsInsideCell.item(j).innerHTML == '#@monitor') {
                    cellWithAnnotationFound = true
                    console.log("Cell with monitor annotation found");
                }
            }
        }

        if(cellWithAnnotationFound) {
            this.monitorHTLM = document.createElement('div');
            this.monitorHTLM.id = 'monitor';
            this.monitorHTLM.innerHTML = 
                '<div style="display: flex; justify-content: center; align-items: center">' +
                    '<div style="height: 200px; width: 500px;">' +
                        '<div style="height: 35px; width: 495px; background-color: #ffb029; display: flex; flex-direction: row; justify-content: left; align-items: center; padding-left: 5px">' +
                            '<text style="font-weight: 900; margin-right: 30px">AWSMonitor</text>' +
                            '<text id="partitions-text" style="font-weight: 900"></text>' +
                        '</div>' +
                        '<div style="height: 35px; width: 440px; background-color: #d6d6d6; display: flex; flex-direction: row; justify-content: space-between; align-items: center;padding-left: 30px; padding-right: 30px">' +
                            '<text style="font-weight: 900;">Status</text>' +
                            '<text style="font-weight: 900">Progress</text>' +
                            '<text style="font-weight: 900">Duration</text>' +
                        '</div>' +
                        '<div style="height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px">' +
                            '<text style="font-weight: 900;">Created</text>' +
                            '<div style="height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6">' +
                                '<div id="created-bar" style="height: 25px; width: 0px; background-color: #80d2ff">' +
                                '</div>' +
                            '</div>' +
                            '<text style="font-weight: 900;">6000 ms</text>' +
                        '</div>' +
                        '<div style="height: 5px; width: 500px; margin-top: 10px; background-color: #d6d6d6">' +
                        '</div>' +
                        '<div style="height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px">' +
                            '<text style="font-weight: 900;">Finished</text>' +
                            '<div style="height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6">' +
                                '<div id="finished-bar" style="height: 25px; width: 0px; background-color: #5bfc60">' +
                                '</div>' +
                            '</div>' +
                            '<text style="font-weight: 900;">2000 ms</text>	' +
                        '</div>' +
                    '</div>' +
                '</div>'
                
            cell.parentNode.insertBefore(this.monitorHTLM, cell.nextElementSibling);
        }
    }

	setInfo(newInfo: string): void {
		this.info = newInfo;
		if(this.dialogOpened) {
			document.getElementById('dialog-info').innerHTML = newInfo;
            
		}
	}

	addListener(): void {
		
		this.lastOutput = "";
		this.selectedCell.outputs.changed.connect(this.outputSlot, "");
	}

	async showAWSMonitor(panel: NotebookPanel): Promise<any> {

		const notebook = panel.content;
		const newCell = notebook.model?.contentFactory.createCodeCell({});


		let oldIndex = notebook.activeCellIndex;

		notebook.model.cells.insert(0, newCell);
		notebook.activeCellIndex = 0;


		//notebook.activeCell.hide();

		const cell: ICellModel = notebook.model.cells.get(0);
		if (!isCodeCellModel(cell)) {
		throw new Error("cell is not a code cell.");
		}

		cell.value.text = "from IPython.core.display import display, HTML\ndisplay(HTML('<div style=\"display: flex; justify-content: center; align-items: center\"><div style=\"height: 200px; width: 500px;\"><div style=\"height: 35px; width: 495px; background-color: #ffb029; display: flex; flex-direction: row; justify-content: left; align-items: center; padding-left: 5px\"><text style=\"font-weight: 900; margin-right: 30px\">AWSMonitor</text><text style=\"font-weight: 900\">Partitions: 64</text></div><div style=\"height: 35px; width: 440px; background-color: #d6d6d6; display: flex; flex-direction: row; justify-content: space-between; align-items: center;padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Status</text><text style=\"font-weight: 900\">Progress</text><text style=\"font-weight: 900\">Duration</text></div><div style=\"height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Created</text><div style=\"height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6\"><div style=\"height: 25px; width: 200px; background-color: #80d2ff\"></div></div><text style=\"font-weight: 900;\">6000 ms</text>	</div><div style=\"height: 5px; width: 500px; margin-top: 10px; background-color: #d6d6d6\"></div><div style=\"height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Finished</text><div style=\"height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6\"><div style=\"height: 25px; width: 100px; background-color: #5bfc60\"></div></div><text style=\"font-weight: 900;\">2000 ms</text>	</div></div></div>'))";

		await NotebookActions.run(notebook, panel.sessionContext);
		
		//console.log(cell.outputs.get(0));

		//notebook.model.cells.remove(0);
		notebook.activeCellIndex = oldIndex;

		notebook.model.cells.changed.connect(this.allCellsSlot, "");

		const cell2: ICellModel = notebook.model.cells.get(1);
		if (!isCodeCellModel(cell2)) {
		throw new Error("cell is not a code cell.");
		}

		cell2.value.changed.connect(this.inputSlot, "");
		
	}

	inputSlot(sender: IObservableString, args: IObservableString.IChangedArgs) {
		console.log(args);
	}

	outputSlot = async (sender: IOutputAreaModel, args: IOutputAreaModel.ChangedArgs): Promise<any> => {
		switch(args.type) {
			case "remove":
				console.log(args);
				break;
			case "add":
			case "set":
				console.log(args);
				var output = <string>args.newValues[0].data['application/vnd.jupyter.stdout'];

				console.log(this.lastOutput);
				var currentOutput = output.replace(this.lastOutput, '');
				console.log(currentOutput);
				if(currentOutput.includes("INFO:root:Before lambdas invoke. Number of lambdas: \d")) {
					var words = currentOutput.split(" ");
    				this.setPartitions(Number.parseInt(words[words.length - 1]));
				} 
				else if(currentOutput.includes("INFO:root:New lambda - \d")) {
					var words = currentOutput.split(" ");
    				this.setCreated(Number.parseInt(words[words.length - 1]));
				}
				else if(currentOutput.includes("INFO:root:Lambdas finished: \d")) {
					var words = currentOutput.split(" ");
    				this.setFinished(Number.parseInt(words[words.length - 1]));
				}

				this.lastOutput = output;
				break;
		}
	}

	setPartitions(partitions: number): void {
		this.partitions = partitions;
		document.getElementById('partitions-text').textContent = "Number of partitions: " + this.partitions;
	}

	setCreated(created: number): void {
		this.created = created;
		document.getElementById('created-bar').style.width = (250*(this.created)/(this.partitions)).toString() + "px";
	}

	setFinished(finished: number): void {
		this.finished = finished;
		document.getElementById('finished-bar').style.width = (250*(this.finished)/(this.partitions)).toString() + "px";
	}

	allCellsSlot(list: IObservableUndoableList<ICellModel>, args: IObservableList.IChangedArgs<ICellModel>) {
		console.log(args);
	}

}



/**
 * Initialization data for the AWSMonitor extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {

	id: 'AWSMonitor:plugin',
	autoStart: true,
	optional: [ISettingRegistry],
	activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {

		console.log('JupyterLab extension AWSMonitor is activated!');
		const monitorButton = new ButtonExtension();
		app.docRegistry.addWidgetExtension('Notebook', monitorButton);

		if (settingRegistry) {
			settingRegistry
			.load(plugin.id)
			.then(settings => {
				console.log('AWSMonitor settings loaded:', settings.composite);
			})
			.catch(reason => {
				console.error('Failed to load settings for AWSMonitor.', reason);
			});
		}
	}
};

export default plugin;
