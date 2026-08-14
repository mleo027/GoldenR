import { app } from 'electron';
import { bootstrapElectronApp } from './app/bootstrap';

app.commandLine.appendSwitch('disable-crash-reporter');

if (!app.isPackaged) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

app.whenReady().then(() => bootstrapElectronApp());
