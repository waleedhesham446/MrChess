import { Component, OnInit, ViewChild } from '@angular/core';
import { MoveChange, NgxChessBoardView } from 'ngx-chess-board';

import { MessageType } from "../shared/Types";

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.scss']
})
export class ChessBoardComponent implements OnInit {

  private main: MessageEventSource;
  public role: number;
  public disabled: boolean = true;
  private gameOver: boolean = false;
  private isPreviousGame: boolean = false;
  public tileSize: number = 500;

  @ViewChild('board', {static: false}) board: NgxChessBoardView;
  
  constructor(
  ) { }

  ngOnInit(): void {
    window.addEventListener("message", (event: MessageEvent) => {
      
      if (event.origin !== window.origin) return;
      
      if (event.data?.type === MessageType.ASSIGN_ROLE) this.initBoard(event.data?.role, event.source as MessageEventSource, event.data?.FEN);
      else if (event.data?.type === MessageType.APPLY_MOVE) this.applyMove(event.data?.move);
      else if (event.data?.type === MessageType.RESTART) this.restart();
    });

    this.handleUnCompletedGame();

    this.handleBoardSize();
  }

  /**
   * Initialize the board
   * @param role either 1 or 2
   * @param source the main window source to send messages back
   * @param FEN previous uncompleted game FEN (if exists)
  **/
  initBoard(role: number, source: MessageEventSource, FEN: string): void {
    this.role = role;
    this.main = source;
    this.checkRole(FEN);
  }
  
  /**
   * Store the game details if it's not completed
  **/
  handleUnCompletedGame(): void {
    addEventListener('beforeunload', () => {
      //  To save the state only one time
      if (this.gameOver || this.role !== 1) return;

      //  Check if the board has at least one move
      const history = this.board.getMoveHistory();
      if(history.length === 0 && !this.isPreviousGame) return;
      
      const FEN = this.board.getFEN();
      localStorage.setItem('FEN', FEN);
    });
  }

  /**
   * Handle the size of the tile depending on the size of window
  **/
  handleBoardSize(): void {
    if (window.innerWidth < 500) this.tileSize = 350;

    window.addEventListener('resize', () => {
      if (window.innerWidth < 500) this.tileSize = 350;
      else this.tileSize = 500;
    });
  }

  /**
   * Handler for move action
   * @param event 
  **/
  move(event: MoveChange): void {
    this.main.postMessage({
      type: MessageType.MOVE,
      player: this.role,
      move: event
    });

    this.disableBoard();
  }

  /**
   * Apply the move that happened in the other board
   * @param move 
   */
  applyMove(move: any): void {
    this.board.move(move?.move);
    this.enableBoard();
    this.checkCheckmate(move);
  }

  /**
   * Enables move action
  **/
  enableBoard(): void {
    this.disabled = false;
  }

  /**
   * Disables move action
  **/
  disableBoard(): void {
    this.disabled = true;
  }

 /**
  * Check the checkmate case
  * @param move last move
  */
  checkCheckmate(move: MoveChange): void {
    if (move.checkmate) {
      this.gameOver = true;
      //  Casted it to any because property 'color' does not exist on type 'MoveChange'. However it exists in 'move' object
      const winnerColor: string = (move as any).color;
      //  To send the message only one time
      if (this.role === 1) this.main.postMessage({ type: MessageType.GAME_END, winnerColor });
    }
  }

  /**
   * Setup each board depending on its role
   * @param FEN previous uncompleted game FEN (if exists)
  **/
  checkRole(FEN?: string): void {
    if (this.role === 1) {
      this.disabled = false;
      if (FEN) {
        this.isPreviousGame = true;
        this.board.setFEN(FEN);
        const turn: string = FEN.split(' ')[1];
        if (turn === 'w') this.enableBoard();
        else this.disableBoard();
      }
    } else if (this.role === 2) {
      this.disabled = true;
      if (FEN) {
        this.isPreviousGame = true;
        this.board.setFEN(FEN);
        const turn: string = FEN.split(' ')[1];
        if (turn === 'b') this.enableBoard();
        else this.disableBoard();
      }
      this.board.reverse();
    }
  }

  /**
   * Reset the board
  **/
  restart(): void {
    this.gameOver = false;
    this.board.reset();
    this.checkRole();
  }
}
