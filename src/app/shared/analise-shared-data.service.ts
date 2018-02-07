import { Injectable } from '@angular/core';
import { Analise } from '../analise/';

import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { FuncaoDados } from '../funcao-dados/index';
import { FuncaoTransacao } from '../funcao-transacao/index';

@Injectable()
export class AnaliseSharedDataService {

  private saveSubject = new Subject<any>();
  private loadSubject = new Subject<any>();

  analise: Analise;

  currentFuncaoDados: FuncaoDados;
  currentFuncaoTransacao: FuncaoTransacao;

  isContratoSelected(): boolean {
    return !_.isUndefined(this.analise.contrato);
  }

  analiseSalva() {
    this.saveSubject.next();
  }

  getSaveSubject(): Observable<any> {
    return this.saveSubject.asObservable();
  }

  analiseCarregada() {
    this.loadSubject.next();
  }

  getLoadSubject(): Observable<any> {
    return this.loadSubject.asObservable();
  }

}
