/** 单条可撤销操作（命令模式） */
export interface UndoCommand {
    label?: string;
    undo: () => void;
    redo: () => void;
}

export interface UndoHistory {
    past: UndoCommand[];
    future: UndoCommand[];
}
