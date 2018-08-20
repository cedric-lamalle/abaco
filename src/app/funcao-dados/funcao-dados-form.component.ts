import {Component, OnInit, ChangeDetectorRef, OnDestroy} from '@angular/core';
import {AnaliseSharedDataService, PageNotificationService} from '../shared';
import {FuncaoDados} from './funcao-dados.model';
import {Analise, AnaliseService} from '../analise';
import {FatorAjuste} from '../fator-ajuste';

import * as _ from 'lodash';
import {Funcionalidade} from '../funcionalidade/index';
import {SelectItem} from 'primeng/primeng';
import {Calculadora} from '../analise-shared/calculadora';
import {DatatableClickEvent} from '@basis/angular-components';
import {ConfirmationService} from 'primeng/primeng';
import {ResumoFuncoes} from '../analise-shared/resumo-funcoes';
import {AfterViewInit, AfterContentInit} from '@angular/core/src/metadata/lifecycle_hooks';
import {Subscription} from 'rxjs/Subscription';

import {FatorAjusteLabelGenerator} from '../shared/fator-ajuste-label-generator';
import {DerChipItem} from '../analise-shared/der-chips/der-chip-item';
import {DerChipConverter} from '../analise-shared/der-chips/der-chip-converter';
import {AnaliseReferenciavel} from '../analise-shared/analise-referenciavel';
import {FuncaoDadosService} from './funcao-dados.service';
import {AnaliseSharedUtils} from '../analise-shared/analise-shared-utils';
import {Manual} from '../manual';
import {Modulo} from '../modulo';

@Component({
    selector: 'app-analise-funcao-dados',
    templateUrl: './funcao-dados-form.component.html'
})
export class FuncaoDadosFormComponent implements OnInit, OnDestroy {

    textHeader: string;
    isEdit;
    nomeInvalido;
    classInvalida;
    impactoInvalido: boolean;
    hideElementTDTR: boolean;
    hideShowQuantidade: boolean;
    showDialog = false;
    sugestoesAutoComplete: string[] = [];
    windowHeightDialog: any;
    windowWidthDialog: any;

    moduloCache: Funcionalidade;
    dersChips: DerChipItem[];
    rlrsChips: DerChipItem[];
    resumo: ResumoFuncoes;
    fatoresAjuste: SelectItem[] = [];
    colunasOptions: SelectItem[];
    colunasAMostrar = [];

    impacto: SelectItem[] = [
        {label: 'Inclusão', value: 'INCLUSAO'},
        {label: 'Alteração', value: 'ALTERACAO'},
        {label: 'Exclusão', value: 'EXCLUSAO'},
        {label: 'Conversão', value: 'CONVERSAO'},
        {label: 'Outros', value: 'ITENS_NAO_MENSURAVEIS'}
    ];

    classificacoes: SelectItem[] = [
        {label: 'ALI - Arquivo Lógico Interno', value: 'ALI'},
        {label: 'AIE - Arquivo de Interface Externa', value: 'AIE'}
    ];

    private fatorAjusteNenhumSelectItem = {label: 'Nenhum', value: undefined};
    private analiseCarregadaSubscription: Subscription;
    private subscriptionSistemaSelecionado: Subscription;
    private nomeDasFuncoesDoSistema: string[] = [];
    public erroTR: boolean;
    public erroTD: boolean;
    public erroUnitario: boolean;
    public erroDeflator: boolean;

    constructor(
        private analiseSharedDataService: AnaliseSharedDataService,
        private confirmationService: ConfirmationService,
        private pageNotificationService: PageNotificationService,
        private changeDetectorRef: ChangeDetectorRef,
        private funcaoDadosService: FuncaoDadosService,
        private analiseService: AnaliseService
    ) {
        const colunas = [
            {header: 'Nome', field: 'name'},
            {header: 'Deflator'},
            {header: 'Impacto', field: 'impacto'},
            {header: 'Módulo'},
            {header: 'Funcionalidade'},
            {header: 'Classificação', field: 'tipo'},
            {header: 'DER (TD)'},
            {header: 'RLR (TR)'},
            {header: 'Complexidade', field: 'complexidade'},
            {header: 'PF - Total'},
            {header: 'PF - Ajustado'}
        ];

        this.colunasOptions = colunas.map((col, index) => {
            col['index'] = index;
            return {
                label: col.header,
                value: col,
            };
        });
    }

    ngOnInit() {
        this.hideShowQuantidade = true;
        this.currentFuncaoDados = new FuncaoDados();
        this.subscribeToAnaliseCarregada();
        this.colunasOptions.map(selectItem => this.colunasAMostrar.push(selectItem.value));
        //  this.subscribeToSistemaSelecionado();

    }

    public buttonSaveEdit() {
        if (this.isEdit) {
            this.editar();
        } else {
            this.adicionar();
        }
    }

    disableTRDER() {
        this.hideElementTDTR = this.analiseSharedDataService.analise.metodoContagem === 'INDICATIVA'
            || this.analiseSharedDataService.analise.metodoContagem === 'ESTIMADA';
    }

    private subscribeToAnaliseCarregada() {
        this.analiseCarregadaSubscription = this.analiseSharedDataService.getLoadSubject().subscribe(() => {
            this.atualizaResumo();
            //  this.loadDataFunctionsName();
        });
    }

    private atualizaResumo() {
        this.resumo = this.analise.resumoFuncaoDados;
        this.changeDetectorRef.detectChanges();
    }

    private subscribeToSistemaSelecionado() {
        this.subscriptionSistemaSelecionado = this.analiseSharedDataService.getSistemaSelecionadoSubject()
            .subscribe(() => {
                this.loadDataFunctionsName();
            });
    }

    // Carrega nome das funçeõs de dados
    private loadDataFunctionsName() {
        const sistemaId: number = this.analiseSharedDataService.analise.sistema.id;
        this.funcaoDadosService.findAllNamesBySistemaId(sistemaId).subscribe(
            nomes => {
                this.nomeDasFuncoesDoSistema = nomes;
                this.sugestoesAutoComplete = nomes.slice();
            });
    }

    autoCompleteNomes(event) {
        const query = event.query;
        // TODO qual melhor método? inclues? startsWith ignore case?
        this.sugestoesAutoComplete = this.nomeDasFuncoesDoSistema
            .filter(nomeFuncao => nomeFuncao.includes(query));
    }

    getTextDialog() {
        this.textHeader = this.isEdit ? 'Alterar Função de Dados' : 'Adicionar Função de Dados';
    }

    get currentFuncaoDados(): FuncaoDados {
        return this.analiseSharedDataService.currentFuncaoDados;
    }

    set currentFuncaoDados(currentFuncaoDados: FuncaoDados) {
        this.analiseSharedDataService.currentFuncaoDados = currentFuncaoDados;
    }

    get funcoesDados(): FuncaoDados[] {
        if (!this.analise.funcaoDados) {
            return [];
        }
        return this.analise.funcaoDados;
    }

    private get analise(): Analise {
        return this.analiseSharedDataService.analise;
    }

    private get manual() {
        if (this.analiseSharedDataService.analise.contrato) {
            return this.analiseSharedDataService.analise.contrato.manual;
        }
        return undefined;
    }

    isContratoSelected(): boolean {
        const isContratoSelected = this.analiseSharedDataService.isContratoSelected();
        if (isContratoSelected) {
            if (this.fatoresAjuste.length === 0) {
                this.inicializaFatoresAjuste(this.manual);
            }
        }
        return isContratoSelected;
    }

    contratoSelecionado() {
        if (this.currentFuncaoDados.fatorAjuste.tipoAjuste.toString() === 'UNITARIO') {
            this.hideShowQuantidade = this.currentFuncaoDados.fatorAjuste === undefined;
        } else {
            this.hideShowQuantidade = true;
        }
    }

    fatoresAjusteDropdownPlaceholder() {
        if (this.isContratoSelected()) {
            return 'Selecione um Deflator';
        } else {
            return `Selecione um Contrato na aba 'Geral' para carregar os Deflatores`;
        }
    }

    // Funcionalidade Selecionada
    functionalitySelected(funcionalidade: Funcionalidade) {
        if (!funcionalidade) {
        } else {
            this.moduloCache = funcionalidade;
        }
        this.currentFuncaoDados.funcionalidade = funcionalidade;
    }

    adicionar() {
        const retorno: boolean = this.verifyDataRequire();
        if (!retorno) {
            this.pageNotificationService.addErrorMsg('Favor preencher o campo obrigatório!');
            return;
        }
        this.desconverterChips();
        this.verificarModulo();
        const funcaoDadosCalculada = Calculadora.calcular(
            this.analise.metodoContagem, this.currentFuncaoDados, this.analise.contrato.manual);

        this.analise.addFuncaoDados(funcaoDadosCalculada);
        this.atualizaResumo();
        this.resetarEstadoPosSalvar();

        this.salvarAnalise();
        this.fecharDialog();
        this.pageNotificationService.addCreateMsgWithName(funcaoDadosCalculada.name);
    }

    private verifyDataRequire(): boolean {
        let retorno = true;

        if (this.currentFuncaoDados.name === undefined) {
            this.nomeInvalido = true;
            retorno = false;
        } else {
            this.nomeInvalido = false;
        }

        if (this.currentFuncaoDados.impacto === undefined) {
            this.impactoInvalido = true;
            retorno = false;
        } else {
            this.impactoInvalido = false;
        }

        if (this.currentFuncaoDados.impacto.indexOf('ITENS_NAO_MENSURAVEIS') === 0
            && this.currentFuncaoDados.fatorAjuste === undefined) {
            this.erroDeflator = true;
            retorno = false;
            this.pageNotificationService.addErrorMsg('Selecione um Deflator');
        } else {
            this.erroDeflator = false;
        }

        this.classInvalida = this.currentFuncaoDados.tipo === undefined;
        if (this.currentFuncaoDados.fatorAjuste !== undefined) {
            if (this.currentFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO' &&
                this.currentFuncaoDados.quantidade === undefined) {
                this.erroUnitario = true;
                retorno = false;
            } else {
                this.erroUnitario = false;
            }
        }

        if (this.analiseSharedDataService.analise.metodoContagem === 'DETALHADA') {
            if (this.rlrsChips === undefined || this.rlrsChips === null) {
                this.erroTR = true;
                retorno = false;
            } else {
                this.erroTR = false;
            }
            if (this.dersChips === undefined || this.dersChips === null) {
                // if (this.manual) {
                this.erroTD = true;
                retorno = false;
                // }
            } else {
                this.erroTD = false;
            }
        }

        if (this.currentFuncaoDados.funcionalidade === undefined) {
            this.pageNotificationService.addErrorMsg('Selecione um Módulo e Submódulo');
            retorno = false;
        }

        return retorno;
    }

    salvarAnalise() {
        this.analiseService.update(this.analise);
    }

    private desconverterChips() {
        if (this.dersChips != null && this.rlrsChips != null) {
            this.currentFuncaoDados.ders = DerChipConverter.desconverterEmDers(this.dersChips);
            this.currentFuncaoDados.rlrs = DerChipConverter.desconverterEmRlrs(this.rlrsChips);
            console.log(this.currentFuncaoDados);
        }
    }

    private editar() {
        const retorno: boolean = this.verifyDataRequire();
        if (!retorno) {
            this.pageNotificationService.addErrorMsg('Favor preencher o campo obrigatório!');
            return;
        }
        this.desconverterChips();
        this.verificarModulo();

        const funcaoDadosCalculada = Calculadora.calcular(
            this.analise.metodoContagem, this.currentFuncaoDados, this.analise.contrato.manual
        );

        this.analise.updateFuncaoDados(funcaoDadosCalculada);
        this.atualizaResumo();
        this.resetarEstadoPosSalvar();

        this.salvarAnalise();
        this.fecharDialog();
        this.pageNotificationService.addSuccessMsg(`Função de dados '${funcaoDadosCalculada.name}' alterada com sucesso`);

    }

    fecharDialog() {
        this.limparMensagensErros();
        this.showDialog = false;
        this.analiseSharedDataService.funcaoAnaliseDescarregada();
        this.currentFuncaoDados = new FuncaoDados();
        this.dersChips = [];
        this.rlrsChips = [];
        window.scrollTo(0, 60);
    }

    limparMensagensErros() {
        this.nomeInvalido = false;
        this.classInvalida = false;
        this.impactoInvalido = false;
        this.erroUnitario = false;
        this.erroTR = false;
        this.erroTD = false;
        this.erroDeflator = false;
    }

    private resetarEstadoPosSalvar() {
        this.currentFuncaoDados = this.currentFuncaoDados.clone();

        this.currentFuncaoDados.artificialId = undefined;
        this.currentFuncaoDados.id = undefined;

        if (this.dersChips !== undefined && this.rlrsChips) {
            this.dersChips.forEach(c => c.id = undefined);
            this.rlrsChips.forEach(c => c.id = undefined);
        }

    }

    public verificarModulo() {
        if (this.currentFuncaoDados.funcionalidade !== undefined) {
            return;
        }
        this.currentFuncaoDados.funcionalidade = this.moduloCache;
    }

    classValida() {
        this.classInvalida = false;
    }

    impactoValido() {
        this.impactoInvalido = false;
    }

    /**
     * Método responsável por recuperar o nome selecionado no combo.
     * @param nome
     */
    recuperarNomeSelecionado(nome: any) {
        this.funcaoDadosService.recuperarFuncaoDadosPorIdNome(this.analise.sistema.id, nome);

        this.funcaoDadosService.recuperarFuncaoDadosPorIdNome(this.analise.sistema.id, nome).subscribe(
            fd => {
                this.prepararParaEdicao(fd);
            });
    }

    datatableClick(event: DatatableClickEvent) {
        if (!event.selection) {
            return;
        }

        const funcaoDadosSelecionada: FuncaoDados = event.selection.clone();
        switch (event.button) {
            case 'edit':
                this.isEdit = true;
                this.prepararParaEdicao(funcaoDadosSelecionada);
                break;
            case 'delete':
                this.confirmDelete(funcaoDadosSelecionada);
                break;
            case 'clone':
                this.disableTRDER();
                this.configurarDialog();
                this.isEdit = false;
                this.prepareToClone(funcaoDadosSelecionada);
                this.currentFuncaoDados.id = undefined;
                this.currentFuncaoDados.artificialId = undefined;
        }
    }

    private prepararParaEdicao(funcaoDadosSelecionada: FuncaoDados) {

        this.disableTRDER();
        this.configurarDialog();

        this.analiseSharedDataService.currentFuncaoDados = funcaoDadosSelecionada;
        this.carregarValoresNaPaginaParaEdicao(funcaoDadosSelecionada);
        this.pageNotificationService.addInfoMsg(`Alterando Função de Dados '${funcaoDadosSelecionada.name}'`);
    }

    // Prepara para clonar
    private prepareToClone(funcaoDadosSelecionada: FuncaoDados) {
        this.analiseSharedDataService.currentFuncaoDados = funcaoDadosSelecionada;
        this.currentFuncaoDados.name = this.currentFuncaoDados.name + ' - Cópia';
        this.carregarValoresNaPaginaParaEdicao(funcaoDadosSelecionada);
        this.pageNotificationService.addInfoMsg(`Clonando Função de Dados '${funcaoDadosSelecionada.name}'`);
    }

    private carregarValoresNaPaginaParaEdicao(funcaoDadosSelecionada: FuncaoDados) {
        this.analiseSharedDataService.funcaoAnaliseCarregada();
        this.carregarDerERlr(funcaoDadosSelecionada);
        this.carregarFatorDeAjusteNaEdicao(funcaoDadosSelecionada);
    }

    private carregarFatorDeAjusteNaEdicao(funcaoSelecionada: FuncaoDados) {
        this.inicializaFatoresAjuste(this.manual);
        funcaoSelecionada.fatorAjuste = _.find(this.fatoresAjuste, {value: {'id': funcaoSelecionada.fatorAjuste.id}}).value;

    }

    private carregarDerERlr(fd: FuncaoDados) {
        this.dersChips = this.loadReference(fd.ders, fd.derValues);
        this.rlrsChips = this.loadReference(fd.rlrs, fd.rlrValues);
    }

    moduloSelected(modulo: Modulo) {
    }

    // Carregar Referencial
    private loadReference(referenciaveis: AnaliseReferenciavel[],
                          strValues: string[]): DerChipItem[] {

        if (referenciaveis) {
            if (referenciaveis.length > 0) {
                return DerChipConverter.converterReferenciaveis(referenciaveis);
            } else {
                return DerChipConverter.converter(strValues);
            }
        } else {
            return DerChipConverter.converter(strValues);
        }
    }

    cancelar() {
        this.showDialog = false;
        this.fecharDialog();
    }


    confirmDelete(funcaoDadosSelecionada: FuncaoDados) {
        this.confirmationService.confirm({
            message: `Tem certeza que deseja excluir a Função de Dados '${funcaoDadosSelecionada.name}'?`,
            accept: () => {
                this.analise.deleteFuncaoDados(funcaoDadosSelecionada);
                this.salvarAnalise();
                this.pageNotificationService.addDeleteMsgWithName(funcaoDadosSelecionada.name);
            }
        });
    }

    formataFatorAjuste(fatorAjuste: FatorAjuste): string {
        return fatorAjuste ? FatorAjusteLabelGenerator.generate(fatorAjuste) : 'Nenhum';
    }

    ordenarColunas(colunasAMostrarModificada: SelectItem[]) {
        this.colunasAMostrar = colunasAMostrarModificada;
        this.colunasAMostrar = _.sortBy(this.colunasAMostrar, col => col.index);
    }

    ngOnDestroy() {
        this.changeDetectorRef.detach();
        this.analiseCarregadaSubscription.unsubscribe();
    }

    openDialog(param: boolean) {
        this.isEdit = param;
        this.hideShowQuantidade = true;
        this.disableTRDER();
        this.configurarDialog();
    }

    configurarDialog() {
        this.getTextDialog();
        this.windowHeightDialog = window.innerHeight * 0.70;
        this.windowWidthDialog = window.innerWidth * 0.60;
        this.showDialog = true;
    }


    private inicializaFatoresAjuste(manual: Manual) {
        console.log("manual.fatoresAjuste ",manual.fatoresAjuste);
        const faS: FatorAjuste[] = _.cloneDeep(manual.fatoresAjuste);
        this.fatoresAjuste =
            faS.map(fa => {
                const label = FatorAjusteLabelGenerator.generate(fa);
                return {label: label, value: fa};
            });
        this.fatoresAjuste.unshift(this.fatorAjusteNenhumSelectItem);
    }

}
