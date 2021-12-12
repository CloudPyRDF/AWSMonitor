import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ICodeCellModel, IMarkdownCellModel } from '@jupyterlab/cells';

import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

import { ServerConnection } from '@jupyterlab/services';

import { URLExt } from '@jupyterlab/coreutils';

import {
  NotebookPanel,
  INotebookModel,
  INotebookTracker
} from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class AWSMonitorExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  dialog: HTMLDialogElement;

  dialogOpened: boolean;

  info = '';

  selectedCell: ICodeCellModel;

  monitorCell: IMarkdownCellModel;

  selectedCellHTML: Element;

  lastOutput: string;

  monitorHTLM: HTMLDivElement;

  partitions: number;

  created: number;

  finished: number;

  startTime: number;

  currentIndex: number;

  kernel: IKernelConnection;

  calculationsFinished = true;

  invokationFinished = false;

  monitorButtonClicked = false;

  stylesAdded = false;

  styles = `
  <style>
    .monitor-outer-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    #monitor-wrapper {
        height: 141px;
        width: 500px;
      border-style: solid;
      border-width: 1px;
        margin-top: 8px;
    }
    #monitor-header {
        height: 30px;
        width: 485px;
        background-color: #ffb029;
        display: flex;
        flex-direction: row;
        justify-content: left;
        align-items: center;
        padding-left: 15px;
    }

    .monitor-title {
      font-family: Roboto, sans-serif;
      font-weight: 400;
      font-size: 13px;
    }

    #monitor-title-text {
      font-family: Roboto, sans-serif;
      margin-right: 15px;
      font-size: 16px;
      margin-top: 14px;
      font-weight: 550;
    }

    #finished-time {
      
    }

    .monitor-content-wrapper {
        height: 30px;
        width: 426px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding-left: 37px;
        padding-right: 37px;
    }

    #monitor-column-titles-wrapper {
        background-color: #d6d6d6;
    }

    .monitor-info-row-wrapper {
        margin-top: 3px;
    }

    .monitor-info-row {
        position:absolute;
        margin-left: 83px;
        height: 25px;
        width: 250px;
        border-style: solid;
      border-width: 1px;
        background-color: #d6d6d6;
      border-radius: 4px;
    }

    .monitor-progress-text {
        position: absolute;
        height: 25px;
        width: 250px;
        text-align: center;
        line-height: 25px;
      font-family: Roboto, sans-serif;
      font-size: 13px;
      padding-left: 43%;
    }

    .progress-bar {
        height: 25px;
        width: 0;
      border-radius: 2px;
    }

    .created-bar-color {
        background-color: #80d2ff;
    }

    #status-text {
      padding-left: 5px;
    }

    .finished-bar-color {
        background-color: #5bfc60;
    }

    .time-container {
      display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      width: 50px
    }

    #monitor-bars-divider {
        height: 5px;
        width: 500px;
        margin-top: 5px;
        background-color: #d6d6d6;
    }
  </style>
`;

  monitorInnerHTML = `
  <div class="monitor-outer-wrapper">
    <div id="monitor-wrapper">
      <div id="monitor-header">
        <p id="monitor-title-text">AWSMonitor</p>
        <p id="partitions-text" class="monitor-title" style="margin-top: 13px">Partitions: </p>
      </div>
      <div id="monitor-column-titles-wrapper" class="monitor-content-wrapper">
		<div id="status-text">
			<p class="monitor-title" style="margin-top: 13px">Status</p>
		</div>
        <p class="monitor-title" style="margin-top: 13px">Progress</p>
        <p class="monitor-title" style="margin-top: 13px">Duration</p>
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <p class="monitor-title" style="margin-top: 13px">Created</p>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <p id="created-number"></p>
          </div>
          <div id="created-bar" class="progress-bar created-bar-color">
          </div>
        </div>
        <div class="time-container">
          <p id="created-time" class="monitor-title" style="margin-top: 13px"></p>
        </div>
      </div>
      <div id="monitor-bars-divider">
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <p class="monitor-title" style="margin-top: 13px">Finished</p>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <p id="finished-number"></p>
          </div>
          <div id="finished-bar" class="progress-bar finished-bar-color">
          </div>
        </div>
		<div class="time-container">
			<p id="finished-time" class="monitor-title" style="margin-top: 13px"></p>	
		</div>
      </div>
    </div>
  </div>
  `;

  snackbarHTML = `
  <span class="material-icons-outlined">
    priority_high
  </span>
  <p>
    Select cell under which you want monitor to be displayed
  </p>
  `;

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    this.dialogOpened = false;
    this.partitions = 0;
    this.created = 0;
    this.finished = 0;
    const monitorButton = new ToolbarButton({
      label: 'AWS Monitor',
      onClick: () => {
        if (!this.monitorButtonClicked) {
          this.showSnackbar();
          this.monitorButtonClicked = true;
        } else {
          if (this.calculationsFinished) {
            this.showMonitor(panel);
            this.calculationsFinished = false;
          } else {
            this.setSnackbarAttributes('Current calculations has not finished yet');
            this.showSnackbar();
          }
        }
      }
    });

    this.sendPostRequestToSaveToken();

    setInterval(() => {
      this.retriveOperationsState();
    }, 500);

    this.addIconLink();

    this.addSnackbar();

    panel.toolbar.addItem('monitorButton', monitorButton);

    return monitorButton;
  }

  addIconLink(): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined';
    document.head.appendChild(link);
  }

  addSnackbar(): void {
    const snackbar = document.createElement('div');
    snackbar.id = 'monitor-snackbar';
    snackbar.innerHTML = this.snackbarHTML;
    document.body.appendChild(snackbar);
  }

  setSnackbarAttributes(text: string): void {
    const snackbar = document.getElementById('monitor-snackbar');
    if (snackbar !== null) {
      snackbar.innerHTML = `
      <span class="material-icons-outlined">
        priority_high
      </span>
      <p>
        ${text}
      </p>
    `;
    }
  }

  addStyles(panel: NotebookPanel): void {
    const notebook = panel.content;
    const cells = notebook.model.cells;
    console.log(cells.length);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells.get(i);
      if (cell.value.text.includes('<style>')) {
        notebook.model.cells.remove(i);
        console.log("styles deleted");
        break;
      }
    }

    const styleCell = notebook.model.contentFactory.createMarkdownCell({});
    styleCell.value.text = this.styles;
    // notebook.model.cells.push(styleCell);
    const oldIndex = notebook.activeCellIndex;
    notebook.model.cells.push(styleCell);
    notebook.activeCellIndex = notebook.model.cells.length - 1;
    notebook.activeCell.hide();
    notebook.activeCellIndex = oldIndex;
  }

  showSnackbar(): void {
    const snackbar = document.getElementById('monitor-snackbar');
    snackbar.className = 'show';
    setTimeout(() => {
      snackbar.className = snackbar.className.replace('show', '');
    }, 3000);
  }

  async retriveOperationsState(): Promise<void> {
    if (this.monitorCell && !this.calculationsFinished) {
      const settings = ServerConnection.makeSettings({});
      const serverResponse = await ServerConnection.makeRequest(
        URLExt.join(settings.baseUrl, '/AWSMonitor'),
        { method: 'GET' },
        settings
      );
      const response = await serverResponse.json();
      if (response['npart'] !== 0) {
        this.setPartitions(response['npart']);
        if (!this.invokationFinished) {
          this.setCreated(response['INV']);
          if (response['npart'] === response['INV']) {
            this.invokationFinished = true;
          }
        }
        this.setFinished(response['FIN']);
        if (response['FIN'] === this.partitions) {
          this.resetStatus();
        }
      }
      console.log(response);
    }
  }

  resetStatus(): void {
    this.invokationFinished = false;
    this.calculationsFinished = true;
    this.partitions = null;
    this.monitorCell.value.text = document.getElementById('monitor' + this.currentIndex).outerHTML;
  }
  async sendPostRequestToSaveToken(): Promise<void> {
    const settings = ServerConnection.makeSettings({});
    ServerConnection.makeRequest(
      URLExt.join(settings.baseUrl, '/AWSMonitor'),
      { method: 'POST'},
      settings
    );
  }

  showMonitor(panel: NotebookPanel): void {
    // const cellsFromDomModel = document.getElementsByClassName(
    //   'lm-Widget p-Widget lm-Panel p-Panel jp-Cell-inputWrapper'
    // );
    if (!this.stylesAdded) {
      this.addStyles(panel);
      this.stylesAdded = true;
    }
    this.monitorCell = panel.content.model.contentFactory.createMarkdownCell({});
    this.currentIndex = 0;
    for (let i = 0; i < 50; i++) {
      const monitorHTML = document.getElementById('monitor' + i);
      if (monitorHTML === null) {
        this.currentIndex = i;
        break;
      }
    }
    this.monitorCell.value.text = this.monitorInnerHTML;
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"partitions-text"',
      '"partitions-text' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-bar"',
      '"created-bar' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-number"',
      '"created-number' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-time"',
      '"created-time' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-bar"',
      '"finished-bar' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-number"',
      '"finished-number' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-time"',
      '"finished-time' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      'div class="monitor-outer-wrapper"',
      'div id="monitor' + this.currentIndex + '" class="monitor-outer-wrapper"'
    );
    panel.content.model.cells.insert(
      panel.content.activeCellIndex + 1,
      this.monitorCell
    );
    // this.insertAWSMonitor(
    //   cellsFromDomModel.item(panel.content.activeCellIndex)
    // );
  }

  removeMonitor(): void {
    if (this.monitorHTLM) {
      const element = document.getElementById('monitor');
      element.parentNode.removeChild(element);
      this.calculationsFinished = false;
      this.invokationFinished = false;
      this.startTime = null;
      this.partitions = null;
    }
  }

  insertAWSMonitor(selectedCellHTML: Element): void {
    this.monitorHTLM = document.createElement('div');
    this.monitorHTLM.id = 'monitor';
    this.monitorHTLM.innerHTML = this.monitorInnerHTML;

    selectedCellHTML.parentNode.insertBefore(
      this.monitorHTLM,
      selectedCellHTML.nextElementSibling
    );
  }

  setPartitions(partitions: number): void {
    if (!this.partitions && partitions !== 0) {
      this.partitions = partitions;
      this.startTime = Date.now();
      document.getElementById('partitions-text' + this.currentIndex).textContent =
        'Partitions: ' + this.partitions;
    }
  }

  setCreated(created: number): void {
    if (created === this.partitions) {
      this.setTimeText(Date.now(), 'created-time' + this.currentIndex);
    }
    document.getElementById('created-bar' + this.currentIndex).style.width =
      ((250 * created) / this.partitions).toString() + 'px';
    document.getElementById('created-number' + this.currentIndex).textContent =
      created + '/' + this.partitions;
  }

  setFinished(finished: number): void {
    if (finished === this.partitions) {
      this.setTimeText(Date.now(), 'finished-time' + this.currentIndex);
    }
    document.getElementById('finished-bar' + this.currentIndex).style.width =
      ((250 * finished) / this.partitions).toString() + 'px';
    document.getElementById('finished-number' + this.currentIndex).textContent =
      finished + '/' + this.partitions;
  }

  setTimeText(time: number, id: string): void {
    const timeToDisplay = (time - this.startTime) / 1000;
    document.getElementById(id).textContent = timeToDisplay.toFixed(2) + ' s';
  }
}

/**
 * Initialization data for the AWSMonitor extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'AWSMonitor:plugin',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, notebooks: INotebookTracker) => {
    console.log('JupyterLab extension AWSMonitor is activated!');
    const monitorExtension = new AWSMonitorExtension();
    app.docRegistry.addWidgetExtension('Notebook', monitorExtension);
  }
};

export default plugin;