import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AnaliseSharedDataService } from '../shared';
import { Analise } from '../analise';
import { Manual } from '../manual';
import { FatorAjuste } from '../fator-ajuste';
import { Sistema, SistemaService } from '../sistema/index';
import { Modulo, ModuloService } from '../modulo';
import { Funcionalidade, FuncionalidadeService } from '../funcionalidade';
import { Subscription } from 'rxjs/Subscription';

import * as _ from 'lodash';

@Component({
  selector: 'app-analise-modulo-funcionalidade',
  templateUrl: './modulo-funcionalidade.component.html'
})
export class ModuloFuncionalidadeComponent implements OnInit {

  @Input()
  isFuncaoDados: boolean;

  @Output()
  moduloSelectedEvent = new EventEmitter<Modulo>();

  @Output()
  funcionalidadeSelectedEvent = new EventEmitter<Funcionalidade>();

  subscriptionAnaliseSalva: Subscription;

  mostrarDialogModulo = false;
  novoModulo: Modulo = new Modulo();
  moduloSelecionado: Modulo;

  funcionalidades: Funcionalidade[];
  mostrarDialogFuncionalidade = false;
  novaFuncionalidade: Funcionalidade = new Funcionalidade();
  funcionalidadeSelecionada: Funcionalidade;

  constructor(
    private analiseSharedDataService: AnaliseSharedDataService,
    private moduloService: ModuloService,
    private sistemaService: SistemaService,
    private funcionalidadeService: FuncionalidadeService
  ) { }

  ngOnInit() {
    if (_.isUndefined(this.isFuncaoDados)) {
      throw new Error('input isFuncaoDados é obrigatório.');
    }

    this.subscriptionAnaliseSalva = this.analiseSharedDataService.getSaveSubject().subscribe(() => {
      this.selectModuloOnAnaliseSalva();
    });
  }

  private selectModuloOnAnaliseSalva() {
    const moduloASelecionar = this.getModuloASelecionarDeAcordoComTipoFuncaoDoComponente();
    if (moduloASelecionar) {
      this.selecionarModulo(moduloASelecionar.id);
    }
  }

  private getModuloASelecionarDeAcordoComTipoFuncaoDoComponente(): Modulo {
    if (this.isFuncaoDados) {
      if (this.analiseSharedDataService.currentFuncaoDados.funcionalidade) {
        return this.analiseSharedDataService.currentFuncaoDados.funcionalidade.modulo;
      }
    } else {
      if (this.analiseSharedDataService.currentFuncaoTransacao.funcionalidade) {
        return this.analiseSharedDataService.currentFuncaoTransacao.funcionalidade.modulo;
      }
    }
  }

  private get sistema(): Sistema {
    return this.analiseSharedDataService.analise.sistema;
  }

  get modulos() {
    if (this.sistema) {
      return this.sistema.modulos;
    }
  }

  isSistemaSelected(): boolean {
    return !_.isUndefined(this.sistema);
  }

  moduloDropdownPlaceholder(): string {
    if (this.isSistemaSelected()) {
      return this.moduloDropdownPlaceholderComSistemaSelecionado();
    } else {
      return `Selecione um Sistema na aba 'Geral' para carregar os Módulos`;
    }
  }

  private moduloDropdownPlaceholderComSistemaSelecionado(): string {
    if (this.sistemaTemModulos()) {
      return 'Selecione um Módulo';
    } else {
      return 'Nenhum Módulo cadastrado';
    }
  }

  private sistemaTemModulos(): boolean {
    return this.sistema.modulos && this.sistema.modulos.length > 0;
  }

  abrirDialogModulo() {
    if (this.isSistemaSelected()) {
      this.mostrarDialogModulo = true;
      // XXX problema em dar new toda hora?
      this.novoModulo = new Modulo();
    }
  }

  fecharDialogModulo() {
    this.mostrarDialogModulo = false;
  }

  isModuloSelected(): boolean {
    return !_.isUndefined(this.moduloSelecionado);
  }

  // FIXME modulo e funcionalidade selecionados, sistema da aba geral mudou
  // funcionalidade deve ser deselecionada
  // provavelmente um observer de sistema alterado no AnaliseSharedDataService
  moduloSelected(modulo: Modulo) {
    this.funcionalidades = modulo.funcionalidades;
    this.moduloSelectedEvent.emit(modulo);
  }

  adicionarModulo() {
    const sistemaId = this.sistema.id;
    // TODO inserir um spinner, talvez bloquear a UI
    this.moduloService.create(this.novoModulo, sistemaId).subscribe((moduloCriado: Modulo) => {
      this.sistemaService.find(sistemaId).subscribe((sistemaRecarregado: Sistema) => {
        this.recarregarSistema(sistemaRecarregado);
        this.selecionarModulo(moduloCriado.id);
      });
    });

    this.fecharDialogModulo();
  }

  private recarregarSistema(sistemaRecarregado: Sistema) {
    this.analiseSharedDataService.analise.sistema = sistemaRecarregado;
  }

  // Para selecionar no dropdown, o objeto selecionado tem que ser o mesmo da lista de opções
  private selecionarModulo(moduloId: number) {
    this.moduloSelecionado = _.find(this.sistema.modulos, { 'id': moduloId });
    this.moduloSelected(this.moduloSelecionado);
  }

  funcionalidadeDropdownPlaceholder() {
    if (this.isModuloSelected()) {
      return this.funcionalidadeDropdownPlaceHolderComModuloSelecionado();
    } else {
      return 'Selecione um Módulo para carregar as Funcionalidades';
    }
  }

  private funcionalidadeDropdownPlaceHolderComModuloSelecionado(): string {
    if (this.moduloSelecionadoTemFuncionalidade()) {
      return 'Selecione uma Funcionalidade';
    } else {
      return 'Nenhuma Funcionalidade cadastrada';
    }
  }

  private moduloSelecionadoTemFuncionalidade(): boolean {
    return this.moduloSelecionado.funcionalidades && this.moduloSelecionado.funcionalidades.length > 0;
  }

  abrirDialogFuncionalidade() {
    if (this.isModuloSelected()) {
      this.mostrarDialogFuncionalidade = true;
      this.novaFuncionalidade = new Funcionalidade();
    }
  }

  fecharDialogFuncionalidade() {
    this.mostrarDialogFuncionalidade = false;
  }

  adicionarFuncionalidade() {
    const moduloId = this.moduloSelecionado.id;
    const sistemaId = this.sistema.id;
    // TODO inserir um spinner
    this.funcionalidadeService.create(this.novaFuncionalidade, moduloId)
      .subscribe((funcionalidadeCriada: Funcionalidade) => {
        this.sistemaService.find(sistemaId).subscribe((sistemaRecarregado: Sistema) => {
          this.recarregarSistema(sistemaRecarregado);
          this.selecionarModulo(moduloId);
          this.selecionarFuncionalidadeRecemCriada(funcionalidadeCriada);
        });
      });

    this.fecharDialogFuncionalidade();
  }

  funcionalidadeSelected(funcionalidade: Funcionalidade) {
    this.funcionalidadeSelectedEvent.emit(funcionalidade);
  }

  private selecionarFuncionalidadeRecemCriada(funcionalidadeCriada: Funcionalidade) {
    this.funcionalidadeSelecionada = _.find(this.moduloSelecionado.funcionalidades,
      { 'id': funcionalidadeCriada.id });
    this.funcionalidadeSelected(this.funcionalidadeSelecionada);
  }

}
