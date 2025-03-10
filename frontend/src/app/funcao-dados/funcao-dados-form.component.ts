import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild, OnChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Column, DatatableClickEvent, DatatableComponent, PageNotificationService } from '@nuvem/primeng-components';
import * as _ from 'lodash';
import { ConfirmationService, SelectItem, FileUpload } from 'primeng';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { Alr } from '../alr/alr.model';
import { Analise, AnaliseService } from '../analise';
import { AnaliseReferenciavel } from '../analise-shared/analise-referenciavel';
import { AnaliseSharedUtils } from '../analise-shared/analise-shared-utils';
import { Calculadora } from '../analise-shared/calculadora';
import { DerChipConverter } from '../analise-shared/der-chips/der-chip-converter';
import { DerChipItem } from '../analise-shared/der-chips/der-chip-item';
import { DerTextParser, ParseResult } from '../analise-shared/der-text/der-text-parser';
import { ResumoFuncoes } from '../analise-shared/resumo-funcoes';
import { FatorAjuste } from '../fator-ajuste';
import { Funcionalidade, FuncionalidadeService } from '../funcionalidade/index';
import { Manual } from '../manual';
import { Modulo, ModuloService } from '../modulo';
import { ResponseWrapper } from '../shared';
import { AnaliseSharedDataService } from '../shared/analise-shared-data.service';
import { FatorAjusteLabelGenerator } from '../shared/fator-ajuste-label-generator';
import { MessageUtil } from '../util/message.util';
import { FuncaoTransacaoService } from '../funcao-transacao/funcao-transacao.service';
import { CalculadoraTransacao } from './../analise-shared/calculadora-transacao';
import { MetodoContagem } from './../analise/analise.model';
import { BaselineAnalitico } from './../baseline/baseline-analitico.model';
import { BaselineService } from './../baseline/baseline.service';
import { Der } from './../der/der.model';
import { FuncaoTransacao, TipoFuncaoTransacao } from './../funcao-transacao/funcao-transacao.model';
import { FuncaoDados, TipoFuncaoDados } from './funcao-dados.model';
import { FuncaoDadosService } from './funcao-dados.service';
import { BlockUiService } from '@nuvem/angular-base';
import { Sistema, SistemaService } from '../sistema';
import { Upload } from '../upload/upload.model';
import { DomSanitizer } from '@angular/platform-browser';
import { Utilitarios } from '../util/utilitarios.util';

@Component({
    selector: 'app-analise-funcao-dados',
    host: {
        "(window:paste)": "handlePaste($event)"
    },
    templateUrl: './funcao-dados-form.component.html',
    providers: [ConfirmationService]
})
export class FuncaoDadosFormComponent implements OnInit, AfterViewInit, OnChanges {
    emptySustantion = '<p><br></p>';
    @Output()
    valueChange: EventEmitter<string> = new EventEmitter<string>();
    parseResult: ParseResult;
    text: string;
    @Input()
    label: string;
    @Input() uploadImagem = true;
    @Input() criacaoTabela = true;
    @ViewChild(DatatableComponent) tables: DatatableComponent;

    public isDisabled = false;
    faS: FatorAjuste[] = [];
    textHeader: string;
    @Input() isView: boolean;
    isEdit: boolean = false;
    crudExist = false;
    nomeInvalido: boolean;
    isSaving: boolean;
    listaFD: string[];
    classInvalida: boolean;
    impactoInvalido: boolean;
    hideElementTDTR: boolean;
    hideShowQuantidade: boolean;
    showDialog = false;
    showMultiplos = false;
    sugestoesAutoComplete: string[] = [];
    impactos: string[];
    windowHeightDialog: any;
    windowWidthDialog: any;
    moduloCache: Funcionalidade;
    dersChips: DerChipItem[] = [];
    rlrsChips: DerChipItem[] = [];
    resumo: ResumoFuncoes;
    fatoresAjuste: SelectItem[] = [];
    colunasOptions: SelectItem[];
    colunasAMostrar = [];
    dadosBaselineFD: BaselineAnalitico[] = [];
    results: string[];
    baselineResults: any[] = [];
    funcoesDadosList: FuncaoDados[] = [];
    funcaoDadosEditar: FuncaoDados[] = [];
    translateSubscriptions: Subscription[] = [];
    viewFuncaoDados = false;
    divergenceComment: String;
    impacto: SelectItem[] = [
        { label: 'Inclusão', value: 'INCLUSAO' },
        { label: 'Alteração', value: 'ALTERACAO' },
        { label: 'Exclusão', value: 'EXCLUSAO' },
        { label: 'Conversão', value: 'CONVERSAO' },
        { label: 'Outros', value: 'ITENS_NAO_MENSURAVEIS' }
    ];

    classificacoes: SelectItem[] = [
        { label: 'ALI - Arquivo Lógico Interno', value: 'ALI' },
        { label: 'AIE - Arquivo de Interface Externa', value: 'AIE' }
    ];

    crud: string[] = ['Excluir', 'Editar', 'Inserir', 'Pesquisar', 'Consultar'];

    selectButtonMultiple: boolean = false;
    mostrarDialogEditarEmLote: boolean = false;
    moduloSelecionadoEmLote: Modulo;
    funcionalidadeSelecionadaEmLote: Funcionalidade;
    classificacaoEmLote: TipoFuncaoDados;
    deflatorEmLote: FatorAjuste;
    evidenciaEmLote: string;
    arquivosEmLote: Upload[] = [];
    quantidadeEmLote: number;
    funcaoDadosEmLote: FuncaoDados[] = []

    idAnalise: number;
    private fatorAjusteNenhumSelectItem = { label: 'Nenhum', value: undefined };
    private analiseCarregadaSubscription: Subscription;
    private subscriptionSistemaSelecionado: Subscription;
    private nomeDasFuncoesDoSistema: string[] = [];
    public erroModulo: boolean;
    public erroTR: boolean;
    public erroTD: boolean;
    public erroUnitario: boolean;
    public erroDeflator: boolean;
    public displayDescriptionDeflator = false;
    public funcoesDados: FuncaoDados[];
    public disableAba = false;
    public analise: Analise;
    public seletedFuncaoDados: FuncaoDados = new FuncaoDados();
    public display = false;

    public modulos: Modulo[];
    private sanitizer: DomSanitizer;
    private lastObjectUrl: string;

    @ViewChild(FileUpload) componenteFile: FileUpload;

    isOrderning: boolean = false;

    funcionalidades: Funcionalidade[] = [];
    mostrarDialogAddModulo: boolean = false;
    mostrarDialogAddFuncionalidade: boolean = false;
    novoModulo: Modulo = new Modulo();
    novaFuncionalidade: Funcionalidade = new Funcionalidade();
    oldModuloId: number;

    numberPages = 20;


    //Variável para o p-editor
    formatsEditor = ["background", "bold", "color", "font", "code", "italic",
        "link", "size", "strike", "script", "underline", "blockquote",
        "header", "indent", "list", "align", "direction", "code-block"]

    constructor(
        private analiseSharedDataService: AnaliseSharedDataService,
        private confirmationService: ConfirmationService,
        private route: ActivatedRoute,
        private pageNotificationService: PageNotificationService,
        private funcaoDadosService: FuncaoDadosService,
        private funcaoTransacaoService: FuncaoTransacaoService,
        private analiseService: AnaliseService,
        private baselineService: BaselineService,
        private router: Router,
        private blockUiService: BlockUiService,
        private sistemaService: SistemaService,
        private funcionalidadeService: FuncionalidadeService,
        private moduloService: ModuloService,
        sanitizer: DomSanitizer,
    ) {
        this.sanitizer = sanitizer;
        this.lastObjectUrl = "";
    }
    ngOnChanges(): void {
    }


    getLabel(label) {
        return label;
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.blockUiService.show();
            this.idAnalise = params['id'];
            this.isView = params['view'] !== undefined;
            this.funcaoDadosService.getVWFuncaoDadosByIdAnalise(this.idAnalise).subscribe(value => {
                this.funcoesDados = value;
                let temp = 1
                for (let i = 0; i < this.funcoesDados.length; i++) {
                    if (this.funcoesDados[i].ordem === null) {
                        this.funcoesDados[i].ordem = temp
                    }
                    temp++
                }
                this.funcoesDados.sort((a, b) => a.ordem - b.ordem);
                if (!this.isView) {
                    this.analiseService.find(this.idAnalise).subscribe(analise => {
                        // analise = new Analise().copyFromJSON(analise);
                        this.exibeComponenteModuloFuncionalidade();
                        this.analise = analise;
                        this.analiseSharedDataService.analise = analise;
                        this.carregarModuloSistema();
                        this.disableAba = this.analise.metodoContagem === MessageUtil.INDICATIVA;
                        this.hideShowQuantidade = true;
                        this.estadoInicial();
                        this.impactos = AnaliseSharedUtils.impactos;
                        this.disableTRDER();
                        this.blockUiService.hide();
                    });
                }
            });
        });
    }

    estadoInicial() {
        this.analiseSharedDataService.funcaoAnaliseDescarregada();
        this.isSaving = false;
        this.hideShowQuantidade = true;
        this.seletedFuncaoDados = new FuncaoDados();
        this.seletedFuncaoDados.quantidade = 0;
        this.subscribeToAnaliseCarregada();
        this.colunasAMostrar = [];
        if (this.colunasOptions) {
            this.colunasOptions.map(selectItem => this.colunasAMostrar.push(selectItem.value));
        }
        this.traduzirClassificacoes();
        this.traduzirImpactos();
        this.inicializaFatoresAjuste(this.analise.manual);
        if (localStorage.getItem("numberPagesFD") != null) {
            this.tables.pDatatableComponent._rows = Number.parseInt(localStorage.getItem("numberPagesFD"));
        }
    }

    public onRowDblclick(event) {
        if (event.target.nodeName === 'TD') {
            this.abrirEditar();
        } else if (event.target.parentNode.nodeName === 'TD') {
            this.abrirEditar();
        }
    }

    ngAfterViewInit() {
        this.setSotableFields();
    }

    setSotableFields() {
        if (this.colunasAMostrar) {
            return;
        }
        // este forEach rodará apenas 1 vez, devido ao @ViewChildren retornar um array
        // this.tables.forEach(table => {
        //     table.columns.forEach(column => {
        //         const item = this.colunasAMostrar.find(element =>
        //             (element.header === column.header)
        //         );
        //         column.sortField = this.getField(item.header);
        //         column.filterField = this.getField(item.header);
        //         this.exceptions(column, item.header);
        //         column.ngAfterContentInit();
        //     });
        // });
    }

    sortColumn(event: any) {
        this.funcoesDados.sort((a, b) => {
            switch (event.field) {
                case 'fatorAjuste':
                    return this.sortByComposityField(a, b, event.field, 'nome');
                case 'funcionalidade':
                    return this.sortByComposityField(a, b, event.field, 'nome');
                case 'sustantation':
                    return this.sortByBinary(a, b, event.field);
                case 'funcionaldiade.modulo.nome':
                    return this.sortByComposityField2(a, b, 'funcionalidade', 'modulo', 'nome');
                default:
                    return this.sortByField(a, b, event.field);
            }
        });
    }

    getField(header: string): string {
        switch (header) {
            case 'Nome':
                return 'name';
            case 'Módulo':
                return 'funcionaldiade.modulo.nome';
            case 'Impacto':
                return 'impacto';
            case 'Deflator':
                return 'fatorAjuste';
            case 'Funcionalidade':
                return 'funcionalidade';
            case 'PF - Total':
                return 'pf';
            case 'PF - Ajustado':
                return 'grossPF';
            case 'Classificação':
                return 'tipo';
            case 'DER (TD)':
                return 'der';
            case 'RLR(TR)':
                return 'rlr';
            case 'Complexidade':
                return 'complexidade';
            case 'Possui Fundamentação':
                return 'sustantation';
        }
    }

    exceptions(column: Column, field: string) {
        if (field === 'der' || field === 'rlr' || field === 'sustantation') {
            column.filterField = undefined;
            column.filter = false;
        }
    }

    sortByComposityField(a: FuncaoDados, b: FuncaoDados, field: string, composity: string) {
        if (a[field][composity] > b[field][composity]) {
            return 1;
        } else if (a[field][composity] < b[field][composity]) {
            return -1;
        }
        return 0;
    }

    sortByComposityField2(a: FuncaoDados, b: FuncaoDados, field: string, composity: string, composity2: string) {
        if (a[field][composity][composity2] > b[field][composity][composity2]) {
            return 1;
        } else if (a[field][composity][composity2] < b[field][composity][composity2]) {
            return -1;
        }
        return 0;
    }

    sortByBinary(a: FuncaoDados, b: FuncaoDados, field: string): number {
        if (a[field] === true && b[field] === false) {
            return 1;
        } else if (a[field] === false && b[field] === true) {
            return -1;
        }
        return 0;
    }

    sortByField(a: FuncaoDados, b: FuncaoDados, field: string): number {
        if (a[field] > b[field]) {
            return 1;
        } else if (a[field] < b[field]) {
            return -1;
        }
        return 0;
    }

    abrirEditar() {
        this.isEdit = true;
        this.prepararParaEdicao(this.funcaoDadosEditar[0]);
    }

    public onChange(editor) {
        const data = editor.getData();
        return data;
    }

    /*
    *   Metodo responsavel por traduzir as classificacoes que ficam em função de dados
    */
    traduzirClassificacoes() {
        // this.translate.stream(['Cadastros.FuncaoDados.Classificacoes.ALI', 'Cadastros.FuncaoDados.Classificacoes.AIE'])
        //     .subscribe((traducao) => {
        //         this.classificacoes = [
        //             {label: traducao['Cadastros.FuncaoDados.Classificacoes.ALI'], value: 'ALI'},
        //             {label: traducao['Cadastros.FuncaoDados.Classificacoes.AIE'], value: 'AIE'},
        //         ];

        //     });
    }

    /*
    *   Metodo responsavel por traduzir os tipos de impacto em função de dados
    */
    traduzirImpactos() {
        // this.translate.stream(['Cadastros.FuncaoDados.Impactos.Inclusao', 'Cadastros.FuncaoDados.Impactos.Alteracao',
        //     'Cadastros.FuncaoDados.Impactos.Exclusao', 'Cadastros.FuncaoDados.Impactos.Conversao',
        //     'Cadastros.FuncaoDados.Impactos.Outros']).subscribe((traducao) => {
        //     this.impacto = [
        //         {label: traducao['Cadastros.FuncaoDados.Impactos.Inclusao'], value: 'INCLUSAO'},
        //         {label: traducao['Cadastros.FuncaoDados.Impactos.Alteracao'], value: 'ALTERACAO'},
        //         {label: traducao['Cadastros.FuncaoDados.Impactos.Exclusao'], value: 'EXCLUSAO'},
        //         {label: traducao['Cadastros.FuncaoDados.Impactos.Conversao'], value: 'CONVERSAO'},
        //         {label: traducao['Cadastros.FuncaoDados.Impactos.Outros'], value: 'ITENS_NAO_MENSURAVEIS'}
        //     ];
        // });
    }

    updateNameImpacto(impacto: string) {
        switch (impacto) {
            case 'INCLUSAO':
                return this.getLabel('Cadastros.FuncaoDados.Inclusao');
            case 'ALTERACAO':
                return this.getLabel('Cadastros.FuncaoDados.Alteracao');
            case 'EXCLUSAO':
                return this.getLabel('Cadastros.FuncaoDados.Exclusao');
            case 'CONVERSAO':
                return this.getLabel('Cadastros.FuncaoDados.Conversao');

        }
    }

    public buttonSaveEdit() {
        if (!(this.seletedFuncaoDados.sustantation)) {
            this.seletedFuncaoDados.sustantation = document.querySelector('.ql-editor').innerHTML;
        }
        if (this.isEdit) {
            this.editar();
        } else {
            if (this.showMultiplos) {
                this.multiplos();
            } else {
                this.adicionar();
            }
        }
    }

    disableTRDER() {
        this.hideElementTDTR = this.analise.metodoContagem === 'INDICATIVA'
            || this.analise.metodoContagem === 'ESTIMADA';
    }

    private subscribeToAnaliseCarregada() {
        this.analiseCarregadaSubscription = this.analiseSharedDataService.getLoadSubject().subscribe(() => {
            this.atualizaResumo();
            //  this.loadDataFunctionsName();
        });
    }

    public carregarDadosBaseline() {
        this.baselineService.baselineAnaliticoFD(this.analise.sistema.id).subscribe((res: ResponseWrapper) => {
            this.dadosBaselineFD = res.json;
        });
    }

    private atualizaResumo() {
        this.resumo = this.analise.resumoFuncaoDados;
    }

    private subscribeToSistemaSelecionado() {
        this.subscriptionSistemaSelecionado = this.analiseSharedDataService.getSistemaSelecionadoSubject()
            .subscribe(() => {
                this.loadDataFunctionsName();
            });
    }

    searchBaseline(event: { query: string; }): void {
        if (this.seletedFuncaoDados && this.seletedFuncaoDados.funcionalidade && this.seletedFuncaoDados.funcionalidade.id) {
            this.funcaoDadosService.autoCompletePEAnalitico(
                event.query, this.seletedFuncaoDados.funcionalidade.id).subscribe(
                    value => {
                        this.baselineResults = value;
                    }
                );
        }
    }

    // Carrega nome das funçeõs de dados
    private loadDataFunctionsName() {
        const sistemaId: number = this.analise.sistema.id;
        this.funcaoDadosService.findAllNamesBySistemaId(sistemaId).subscribe(
            nomes => {
                this.nomeDasFuncoesDoSistema = nomes;
                this.sugestoesAutoComplete = nomes.slice();

            });
    }

    autoCompleteNomes(event: { query: string; }) {

        // TODO qual melhor método? inclues? startsWith ignore case?
        this.sugestoesAutoComplete = this.nomeDasFuncoesDoSistema

            .filter(nomeFuncao => nomeFuncao.startsWith(event.query));
    }

    getTextDialog() {
        this.textHeader = this.isEdit ? this.getLabel('Alterar Função de Dados')
            : this.getLabel('Adicionar Função de Dados');
    }

    private setFieldsFilter() {
        this.funcoesDados.forEach(fd => this.setFields(fd));
    }


    private setFields(fd: FuncaoDados) {
        return Object.defineProperties(fd, {
            'totalDers': { value: fd.derValue(), writable: true },
            'totalRlrs': { value: fd.rlrValue(), writable: true },
            'deflator': { value: this.formataFatorAjuste(fd.fatorAjuste), writable: true },
            'impactoFilter': { value: this.updateNameImpacto(fd.impacto), writable: true },
            'nomeFuncionalidade': { value: fd.funcionalidade.nome, writable: true },
            'nomeModulo': { value: fd.funcionalidade.modulo.nome, writable: true }
        });
    }

    private get manual() {
        if (this.analise.manual) {
            if (
                this.analise.manual.fatoresAjuste &&
                this.analise.manual.fatoresAjuste.length === 0
            ) {
                this.funcaoDadosService.getManualDeAnalise(
                    this.analise.manual.id
                ).subscribe(manual => {
                    this.analise.manual = manual;
                });
            }
            return this.analise.manual;
        }
        return undefined;
    }

    isContratoSelected(): boolean {
        if (this.analise && this.analise.contrato) {
            if (this.fatoresAjuste.length === 0) {
                this.inicializaFatoresAjuste(this.analise.manual);
            }
            return true;
        } else {
            return false;
        }
    }


    fatoresAjusteDropdownPlaceholder() {
        if (this.isContratoSelected()) {
            return this.getLabel('Selecione um Deflator');
        } else {
            return this.getLabel('Selecione um Contrato na aba Geral para carregar os Deflatores');
        }
    }

    multiplos(): Boolean {
        const lstFuncaoDados: FuncaoDados[] = [];
        const lstFuncaoDadosToSave: Observable<any>[] = [];
        const lstFuncaoDadosWithExist: Observable<Boolean>[] = [];
        let retorno: boolean = this.verifyDataRequire();
        this.desconverterChips();
        this.verificarModulo();
        this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(this.seletedFuncaoDados);
        const funcaoDadosCalculada = Calculadora.calcular(this.analise.metodoContagem,
            this.seletedFuncaoDados,
            this.analise.contrato.manual);
        for (const nome of this.parseResult.textos) {
            lstFuncaoDadosWithExist.push(
                this.funcaoDadosService.existsWithName(
                    nome,
                    this.analise.id,
                    this.seletedFuncaoDados.funcionalidade.id,
                    this.seletedFuncaoDados.funcionalidade.modulo.id)
            );
            const funcaoDadosMultp: FuncaoDados = funcaoDadosCalculada.clone();
            funcaoDadosMultp.name = nome;
            lstFuncaoDados.push(funcaoDadosMultp);
        }
        forkJoin(lstFuncaoDadosWithExist).subscribe(listExistWithName => {
            for (const value of listExistWithName) {
                if (value) {
                    this.pageNotificationService.addErrorMessage(this.getLabel('Registro já cadastrado.'));
                    retorno = false;
                    break;
                }
            }
            if (retorno) {
                this.fecharDialog();
                this.estadoInicial();
                this.resetarEstadoPosSalvar();
                lstFuncaoDados.forEach(funcaoDadosMultp => {
                    lstFuncaoDadosToSave.push(
                        this.funcaoDadosService.create(funcaoDadosMultp, this.analise.id, funcaoDadosMultp.files?.map(item => item.logo))
                    );
                });
                forkJoin(lstFuncaoDadosToSave).subscribe(respCreate => {
                    respCreate.forEach((funcaoDados) => {
                        this.pageNotificationService.addCreateMsg(funcaoDados.name);
                        const funcaoDadosTable: FuncaoDados = new FuncaoDados().copyFromJSON(funcaoDados);
                        funcaoDadosTable.funcionalidade = funcaoDadosCalculada.funcionalidade;
                        this.setFields(funcaoDadosTable);
                        this.funcoesDados.push(funcaoDadosTable);
                    });
                    this.analiseService.updateSomaPf(this.analise.id).subscribe();
                    return true;
                });
            } else {
                return false;
            }
        });
        return retorno;
    }

    validarNameFuncaoTransacaos(ft: FuncaoTransacao) {
        const that = this;
        return new Promise(resolve => {
            if (!(that.analise.funcaoTransacaos) || that.analise.funcaoTransacaos.length === 0) {
                return resolve(true);
            }
            that.analise.funcaoTransacaos.forEach((data, index) => {
                if (data.comparar(ft)) {
                    return resolve(false);
                }
                if (!that.analise.funcaoTransacaos[index + 1]) {
                    return resolve(true);
                }
            });
        });
    }

    adicionar(): boolean {
        const retorno: boolean = this.verifyDataRequire();
        if (!retorno) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return retorno;
        } else {
            this.desconverterChips();
            this.verificarModulo();
            this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(this.seletedFuncaoDados);
            const funcaoDadosCalculada = Calculadora.calcular(this.analise.metodoContagem,
                this.seletedFuncaoDados,
                this.analise.contrato.manual);
            this.funcaoDadosService.existsWithName(
                this.seletedFuncaoDados.name,
                this.analise.id,
                this.seletedFuncaoDados.funcionalidade.id,
                this.seletedFuncaoDados.funcionalidade.modulo.id).subscribe(value => {
                    if (value === false) {
                        funcaoDadosCalculada.ordem = this.funcoesDados.length + 1;
                        this.funcaoDadosService.create(funcaoDadosCalculada, this.analise.id, funcaoDadosCalculada.files?.map(item => item.logo)).subscribe(
                            (funcaoDados) => {
                                this.pageNotificationService.addCreateMsg(funcaoDadosCalculada.name);
                                funcaoDadosCalculada.id = funcaoDados.id;
                                this.setFields(funcaoDadosCalculada);
                                this.funcoesDados.push(funcaoDadosCalculada);
                                this.fecharDialog();
                                this.atualizaResumo();
                                this.estadoInicial();
                                this.resetarEstadoPosSalvar();
                                this.analiseService.updateSomaPf(this.analise.id).subscribe();
                            }
                        );
                    } else {
                        this.pageNotificationService.addErrorMessage(this.getLabel('Registro Cadastrado'));
                    }
                    return retorno;
                });
        }
    }

    private verifyDataRequire(): boolean {
        let retorno = true;
        if (!(this.seletedFuncaoDados.name) && !(this.multiplos && this.text)) {
            this.nomeInvalido = true;
            retorno = false;
        } else {
            this.nomeInvalido = false;
        }

        if (!this.seletedFuncaoDados.tipo) {
            this.classInvalida = true;
            retorno = false;
        } else {
            this.classInvalida = false;
        }

        if (!this.seletedFuncaoDados.fatorAjuste) {
            this.erroDeflator = true;
            retorno = false;
        } else {
            this.erroDeflator = false;
        }

        if (this.seletedFuncaoDados.impacto) {
            if (this.seletedFuncaoDados.impacto.indexOf('ITENS_NAO_MENSURAVEIS') === 0 &&
                this.seletedFuncaoDados.fatorAjuste === undefined) {
                this.erroDeflator = false;
                retorno = false;
                this.pageNotificationService.addErrorMessage(this.getLabel('Selecione um Deflator'));
            }
        } else {
            this.erroDeflator = true;
        }

        if (this.seletedFuncaoDados.fatorAjuste) {
            if (this.seletedFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO' &&
                !(this.seletedFuncaoDados.quantidade && this.seletedFuncaoDados.quantidade > 0)) {
                this.erroUnitario = true;
                retorno = false;
            } else {
                this.erroUnitario = false;
            }
        }

        if (this.analise.metodoContagem === 'DETALHADA' && !(this.seletedFuncaoDados.fatorAjuste && this.seletedFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO')) {

            if (!this.rlrsChips || this.rlrsChips.length < 1) {
                this.erroTR = true;
                retorno = false;
            } else {
                this.erroTR = false;
            }

            if (!this.dersChips || this.dersChips.length < 1) {
                this.erroTD = true;
                retorno = false;
            } else {
                this.erroTD = false;
            }
        }

        if (this.seletedFuncaoDados.funcionalidade === undefined) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Selecione um Módulo e Funcionalidade.'));
            this.erroModulo = true;
            retorno = false;
        } else {
            this.erroModulo = false;
        }

        return retorno;
    }

    private desconverterChips() {
        if (this.dersChips != null && this.rlrsChips != null) {
            this.seletedFuncaoDados.ders = DerChipConverter.desconverterEmDers(this.dersChips);
            this.seletedFuncaoDados.rlrs = DerChipConverter.desconverterEmRlrs(this.rlrsChips);
        }
    }

    private editar() {
        const retorno: boolean = this.verifyDataRequire();
        if (!retorno) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return;
        } else {
            this.funcaoDadosService.existsWithName(
                this.seletedFuncaoDados.name,
                this.analise.id,
                this.seletedFuncaoDados.funcionalidade.id,
                this.seletedFuncaoDados.funcionalidade.modulo.id,
                this.seletedFuncaoDados.id)
                .subscribe(existFuncaoDado => {
                    this.desconverterChips();
                    this.verificarModulo();
                    this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(this.seletedFuncaoDados);
                    const funcaoDadosCalculada = Calculadora.calcular(
                        this.analise.metodoContagem, this.seletedFuncaoDados, this.analise.contrato.manual);
                    this.funcaoDadosService.update(funcaoDadosCalculada, funcaoDadosCalculada.files?.map(item => item.logo)).subscribe(value => {
                        this.funcoesDados = this.funcoesDados.filter((funcaoDados) => (funcaoDados.id !== funcaoDadosCalculada.id));
                        this.setFields(funcaoDadosCalculada);
                        this.funcoesDados.push(funcaoDadosCalculada);
                        this.resetarEstadoPosSalvar();
                        this.pageNotificationService.addSuccessMessage(`${this.getLabel('Cadastros.FuncaoDados.Mensagens.msgFuncaoDados')}
                '${funcaoDadosCalculada.name}' ${this.getLabel(' alterada com sucesso')}`);
                        this.fecharDialog();
                        this.analiseService.updateSomaPf(this.analise.id).subscribe();
                    });
                });
        }
    }

    fecharDialog() {
        this.text = undefined;
        this.limparMensagensErros();
        this.showDialog = false;
        this.analiseSharedDataService.funcaoAnaliseDescarregada();
        this.seletedFuncaoDados = new FuncaoDados();
        this.dersChips = [];
        this.rlrsChips = [];
        this.componenteFile.files = [];
        this.oldModuloId = undefined;
    }

    limparMensagensErros() {
        this.nomeInvalido = false;
        this.classInvalida = false;
        this.impactoInvalido = false;
        this.erroModulo = false;
        this.erroUnitario = false;
        this.erroTR = false;
        this.erroTD = false;
        this.erroDeflator = false;
    }

    private resetarEstadoPosSalvar() {
        this.seletedFuncaoDados = this.seletedFuncaoDados.clone();
        this.funcoesDados.sort((a, b) => a.ordem - b.ordem);
        this.updateIndex();
        this.seletedFuncaoDados.artificialId = undefined;
        this.seletedFuncaoDados.id = undefined;

        if (this.dersChips && this.rlrsChips) {
            this.dersChips.forEach(c => c.id = undefined);
            this.rlrsChips.forEach(c => c.id = undefined);
        }

        this.tables.selectedRow = [];
        this.selectButtonMultiple = false;
    }

    public verificarModulo() {
        if (this.seletedFuncaoDados.funcionalidade !== undefined) {
            return;
        }
        this.seletedFuncaoDados.funcionalidade = this.moduloCache;
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
    recuperarNomeSelecionado(funcaoDados: FuncaoDados) {
        this.funcaoDadosService.getFuncaoDadosBaseline(funcaoDados.id)
            .subscribe((res: FuncaoDados) => {
                this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(res);
                this.seletedFuncaoDados.id = null;
                this.seletedFuncaoDados.ordem = this.funcoesDados.length + 1;
                this.carregarValoresNaPaginaParaEdicao(this.seletedFuncaoDados);
                this.disableTRDER();
                this.configurarDialog();
            });
    }

    clonar() {
        this.disableTRDER();
        this.configurarDialog();
        this.isEdit = false;
        this.prepareToClone(this.funcaoDadosEditar[0]);
        this.seletedFuncaoDados.id = undefined;
        this.seletedFuncaoDados.artificialId = undefined;
        this.textHeader = this.getLabel('Clonar Função de Dados');
    }


    datatableClick(event: DatatableClickEvent) {
        if (!(event.selection) && event.button !== 'filter') {
            return;
        }

        switch (event.button) {
            case 'edit':
                this.isEdit = true;
                this.prepararParaEdicao(this.funcaoDadosEditar[0]);
                break;
            case 'delete':
                this.confirmDelete(this.funcaoDadosEditar);
                break;
            case 'view':
                this.viewFuncaoDados = true;
                this.prepararParaVisualizar(this.funcaoDadosEditar[0]);
                break;
        }
    }

    inserirCrud(funcaoTransacaoAtual: FuncaoTransacao) {
        this.funcaoTransacaoService.existsWithName(
            funcaoTransacaoAtual.name,
            this.analise.id,
            funcaoTransacaoAtual.funcionalidade.id,
            funcaoTransacaoAtual.funcionalidade.modulo.id)
            .subscribe(existFuncaoTranasacao => {
                if (!existFuncaoTranasacao) {
                    this.funcaoTransacaoService.create(funcaoTransacaoAtual, this.analise.id).subscribe(() => {
                        this.pageNotificationService.addCreateMsg(funcaoTransacaoAtual.name);
                        this.resetarEstadoPosSalvar();
                        this.estadoInicial();
                        this.analiseService.updateSomaPf(this.analise.id).subscribe();
                    });
                } else {
                    this.pageNotificationService.addErrorMessage('CRUD já cadastrado!');
                }
            });
    }

    private gerarAlr(funcaoTransacaoCalculada: FuncaoTransacao, fnDado: FuncaoDados) {
        const alr = new Alr(undefined, fnDado.name, undefined, null);
        if (funcaoTransacaoCalculada.alrs !== undefined && funcaoTransacaoCalculada.alrs != null) {
            funcaoTransacaoCalculada.alrs.push(alr);
        } else {
            const alrs: Alr[] = [];
            alrs.push(alr);
            funcaoTransacaoCalculada.alrs = alrs;
        }
    }

    public createCrud(funcaoDadosSelecionada) {
        const lstFuncaoTransacaoCrud: FuncaoTransacao[] = [];
        const lstFuncaoTransacaoToVerify: Observable<any>[] = [];
        const lstFuncaoTransacaoToInclud: Observable<any>[] = [];
        this.blockUiService.show();
        this.funcaoDadosService.getById(funcaoDadosSelecionada.id).subscribe(funcaoDados => {
            this.crud.forEach(element => {
                lstFuncaoTransacaoCrud.push(this.gerarFuncaoTransacao(element, funcaoDados));
            });
            lstFuncaoTransacaoCrud.forEach(funcaoTransacaoAtual => {
                lstFuncaoTransacaoToVerify.push(
                    this.funcaoTransacaoService.existsWithName(
                        funcaoTransacaoAtual.name,
                        this.analise.id,
                        funcaoTransacaoAtual.funcionalidade.id,
                        funcaoTransacaoAtual.funcionalidade.modulo.id)
                );
            });
            forkJoin(lstFuncaoTransacaoToVerify).subscribe(lstFuncaoTranscao => {
                let index = 0;
                for (const existFuncaoTranasacao of lstFuncaoTranscao) {
                    if (!existFuncaoTranasacao) {
                        lstFuncaoTransacaoToInclud.push(
                            this.funcaoTransacaoService.create(lstFuncaoTransacaoCrud[index], this.analise.id)
                        );
                    } else {
                        this.pageNotificationService.addErrorMessage('CRUD já cadastrado!');
                    }
                    index++;
                }
                forkJoin(lstFuncaoTransacaoToInclud).subscribe(funcoesTransacoes => {
                    funcoesTransacoes.forEach(
                        () => {
                            this.pageNotificationService.addCreateMsg(funcoesTransacoes['name']);
                            this.resetarEstadoPosSalvar();
                            this.estadoInicial();
                            this.analiseService.updateSomaPf(this.analise.id).subscribe();
                        });
                    this.blockUiService.hide();
                });
            });
        });
    }

    private gerarFuncaoTransacao(tipo: string, fdSelecionada: FuncaoDados): FuncaoTransacao {
        const ft = new FuncaoTransacao();
        ft.name = tipo;
        ft.funcionalidade = fdSelecionada.funcionalidade;
        if (tipo === 'Pesquisar') {
            ft.tipo = TipoFuncaoTransacao.CE;
        } else if (tipo === 'Consultar') {
            ft.tipo = TipoFuncaoTransacao.CE;
        } else {
            ft.tipo = TipoFuncaoTransacao.EE;
        }
        ft.fatorAjuste = fdSelecionada.fatorAjuste;
        ft.ders = [];
        fdSelecionada.ders.forEach(item => ft.ders.push(item));
        if (this.analise.metodoContagem === MetodoContagem.DETALHADA) {
            this.criarDersMensagemAcao(ft.ders);
            this.gerarAlr(ft, fdSelecionada);
        }
        this.desconverterChips();
        this.verificarModulo();
        const funcaoTransacaoCalculada = CalculadoraTransacao.calcular(this.analise.metodoContagem,
            ft,
            this.analise.contrato.manual);
        return funcaoTransacaoCalculada;
    }

    private criarDersMensagemAcao(ders: Der[]) {
        ders.push(new Der(undefined, 'Mensagem'));
        ders.push(new Der(undefined, 'Ação'));
    }


    private prepararParaEdicao(funcaoDadosSelecionada: FuncaoDados) {
        this.blockUiService.show();
        this.funcaoDadosService.getById(funcaoDadosSelecionada.id).subscribe(funcaoDados => {
            this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(funcaoDados);
            this.seletedFuncaoDados.ordem = funcaoDadosSelecionada.ordem;
            if (this.seletedFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO' && this.faS[0]) {
                this.hideShowQuantidade = false;
            } else {
                this.hideShowQuantidade = true;
            }
            this.carregarValoresNaPaginaParaEdicao(this.seletedFuncaoDados);
            this.disableTRDER();
            this.configurarDialog();
            this.blockUiService.hide();
        });
    }

    // Prepara para clonar
    private prepareToClone(funcaoDadosSelecionada: FuncaoDados) {
        this.blockUiService.show();
        this.funcaoDadosService.getById(funcaoDadosSelecionada.id).subscribe(funcaoDados => {
            this.seletedFuncaoDados = new FuncaoDados().copyFromJSON(funcaoDados);
            this.seletedFuncaoDados.id = null;
            this.seletedFuncaoDados.name = this.seletedFuncaoDados.name + this.getLabel('- Cópia');
            this.seletedFuncaoDados.ordem = this.funcoesDados.length + 1;
            this.carregarValoresNaPaginaParaEdicao(this.seletedFuncaoDados);
            this.disableTRDER();
            this.configurarDialog();
            this.pageNotificationService.addInfoMessage(
                `${this.getLabel('Clonando Função de Dados ')} '${funcaoDadosSelecionada.name}'`
            );
            this.blockUiService.hide();
        });
    }

    private carregarValoresNaPaginaParaEdicao(funcaoDadosSelecionada: FuncaoDados) {
        /* Envia os dados para o componente modulo-funcionalidade-component.ts*/
        this.updateIndex();
        this.funcaoDadosService.mod.next(funcaoDadosSelecionada.funcionalidade);
        this.analiseSharedDataService.funcaoAnaliseCarregada();
        this.analiseSharedDataService.currentFuncaoDados = funcaoDadosSelecionada;
        if (this.analise.metodoContagem !== "ESTIMADA") {
            this.carregarDerERlr(funcaoDadosSelecionada);
        }
        this.carregarFatorDeAjusteNaEdicao(funcaoDadosSelecionada);
        this.carregarArquivos();
        this.carregarModuloFuncionalidade(funcaoDadosSelecionada);
    }
    carregarModuloFuncionalidade(funcaoDadosSelecionada: FuncaoDados) {
        //CarregarModulo
        this.moduloSelected(funcaoDadosSelecionada.funcionalidade.modulo);

    }

    private carregarFatorDeAjusteNaEdicao(funcaoSelecionada: FuncaoDados) {
        if (funcaoSelecionada.fatorAjuste !== undefined) {
            const item: SelectItem = this.fatoresAjuste.find(selectItem => {
                return selectItem.value && funcaoSelecionada.fatorAjuste.id === selectItem.value['id'];
            });
            if (item && item.value) {
                funcaoSelecionada.fatorAjuste = item.value;
            }
        }
    }

    private carregarDerERlr(fd: FuncaoDados) {
        if (fd.ders && fd.derValues) {
            const ders = this.loadReference(fd.ders, fd.derValues);
            this.dersChips = ders.filter(der => {
                return !(der.text === 'Mensagem' || der.text === 'Ação');
            });
            this.rlrsChips = this.loadReference(fd.rlrs, fd.rlrValues);
        }
    }

    // Carregar Referencial
    private loadReference(referenciaveis: AnaliseReferenciavel[],
        strValues: string[]): DerChipItem[] {
        if (referenciaveis) {
            if (referenciaveis.length > 0) {
                if (this.isEdit) {
                    return DerChipConverter.converterReferenciaveis(referenciaveis);
                } else {
                    return DerChipConverter.convertertReferenciaveisToClone(referenciaveis);

                }
            } else {
                return DerChipConverter.converter(strValues);
            }
        } else {
            return DerChipConverter.converter(strValues);
        }
    }

    cancelar() {
        this.fecharDialog();
    }

    confirmDelete(funcaoDadosSelecionada: FuncaoDados[]) {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir as funções de dados selecionada?',
            accept: () => {
                funcaoDadosSelecionada.forEach(funcaoDados => {
                    this.funcaoDadosService.delete(funcaoDados.id).subscribe(value => {
                        this.funcoesDados = this.funcoesDados.filter((funcaoDadosEdit) => (funcaoDadosEdit.id !== funcaoDados.id));
                        this.analiseService.updateSomaPf(this.analise.id).subscribe();
                        this.updateIndex();
                        this.resetarEstadoPosSalvar();
                    });
                })
                this.pageNotificationService.addDeleteMsg("Funções deletadas com sucesso!");
            }
        });
    }

    formataFatorAjuste(fatorAjuste: FatorAjuste): string {
        return fatorAjuste ? FatorAjusteLabelGenerator.generate(fatorAjuste) : this.getLabel('Nenhum');
    }

    ordenarColunas(colunasAMostrarModificada: SelectItem[]) {
        this.colunasAMostrar = colunasAMostrarModificada;
        this.colunasAMostrar = _.sortBy(this.colunasAMostrar, col => col.index);
    }

    openDialog(param: boolean) {
        this.subscribeToAnaliseCarregada();
        this.isEdit = param;
        this.disableTRDER();
        this.configurarDialog();
        this.seletedFuncaoDados.sustantation = null;
        if (this.seletedFuncaoDados.fatorAjuste && this.seletedFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO' && this.faS[0]) {
            this.hideShowQuantidade = false;
        } else {
            this.hideShowQuantidade = true;
        }
    }

    configurarDialog() {
        this.getTextDialog();
        this.windowHeightDialog = window.innerHeight * 0.60;
        this.windowWidthDialog = window.innerWidth * 0.50;
        this.showDialog = true;
    }

    private inicializaFatoresAjuste(manual: Manual) {
        if (manual) {
            if (manual.fatoresAjuste) {
                this.faS = _.cloneDeep(manual.fatoresAjuste);
                this.faS = this.faS.filter(value => value.tipoAjuste !== 'UNITARIO');
                this.faS.sort((n1, n2) => {
                    if (n1.fator < n2.fator) {
                        return 1;
                    }
                    if (n1.fator > n2.fator) {
                        return -1;
                    }
                    return 0;
                });
                this.fatoresAjuste =
                    this.faS.map(fa => {
                        const label = FatorAjusteLabelGenerator.generate(fa);
                        return { label: label, value: fa };
                    });
                this.fatoresAjuste.unshift(this.fatorAjusteNenhumSelectItem);
            }
        }
    }

    textChanged() {
        this.valueChange.emit(this.text);
        this.parseResult = DerTextParser.parse(this.text);
    }

    buttonMultiplos() {
        this.showMultiplos = !this.showMultiplos;
    }

    contratoSelecionado() {
        if (this.seletedFuncaoDados.fatorAjuste && this.seletedFuncaoDados.fatorAjuste.tipoAjuste === 'UNITARIO') {
            this.hideShowQuantidade = this.seletedFuncaoDados.fatorAjuste === undefined;
        } else {
            this.seletedFuncaoDados.quantidade = undefined;
            this.hideShowQuantidade = true;
            this.seletedFuncaoDados.quantidade = undefined;
        }
    }


    handleChange(e) {
        const index = e.index;
        let link;
        switch (index) {
            case 0:
                if (this.isView) {
                    link = ['/analise/' + this.idAnalise + '/view'];
                } else {
                    link = ['/analise/' + this.idAnalise + '/edit'];
                }
                break;
            case 1:
                return;
            case 2:
                if (this.isView) {
                    link = ['/analise/' + this.idAnalise + '/funcao-transacao/view'];
                } else {
                    link = ['/analise/' + this.idAnalise + '/funcao-transacao'];
                }
                break;
            case 3:
                if (this.isView) {
                    link = ['/analise/' + this.idAnalise + '/resumo/view'];
                } else {
                    link = ['/analise/' + this.idAnalise + '/resumo'];
                }
                break;
        }
        this.router.navigate(link);
    }

    showDeflator() {
        if (this.seletedFuncaoDados.fatorAjuste) {
            this.displayDescriptionDeflator = true;
        }
    }
    copyToEvidence() {
        if (this.seletedFuncaoDados.sustantation) {
            this.seletedFuncaoDados.sustantation = this.seletedFuncaoDados.sustantation + this.seletedFuncaoDados.fatorAjuste.descricao;
        } else {
            this.seletedFuncaoDados.sustantation = this.seletedFuncaoDados.fatorAjuste.descricao;
        }
        this.displayDescriptionDeflator = false;
    }
    private prepararParaVisualizar(funcaoDadosSelecionada: FuncaoDados) {
        this.blockUiService.show();
        this.funcaoDadosService.getById(funcaoDadosSelecionada.id)
            .subscribe(funcaoDados => {
                this.seletedFuncaoDados = funcaoDados;
                this.blockUiService.hide();
            });
    }
    public selectFD(event) {
        localStorage.setItem("numberPagesFD", this.tables.pDatatableComponent._rows.toString());
        if (event.shiftKey === true) {
            let fim = this.funcoesDados.indexOf(this.tables.selectedRow[0]);
            let inicio = this.funcoesDados.indexOf(this.funcaoDadosEditar[0]);
            this.tables.selectedRow = [];
            if (inicio < fim) {
                for (let i = inicio; i <= fim; i++) {
                    this.tables.selectedRow.push(this.funcoesDados[i]);
                }
            } else {
                for (let i = fim; i <= inicio; i++) {
                    this.tables.selectedRow.push(this.funcoesDados[i]);
                }
            }
        }
        this.tables.pDatatableComponent.metaKeySelection = true;
        if (this.tables && this.tables.selectedRow) {
            this.funcaoDadosEditar = this.tables.selectedRow;
            if (this.tables.selectedRow.length > 1) {
                this.selectButtonMultiple = true;
            }
            else {
                this.selectButtonMultiple = false;
            }
        }
    }

    prepararEditarEmLote() {
        if (this.funcaoDadosEditar.length < 2) {
            return this.pageNotificationService.addErrorMessage("Selecione mais de 1 registro para editar em lote.")
        }
        for (let i = 0; i < this.funcaoDadosEditar.length; i++) {
            const funcaoDadosSelecionada = this.funcaoDadosEditar[i];
            this.funcaoDadosService.getById(funcaoDadosSelecionada.id).subscribe(funcaoDados => {
                this.funcaoDadosEmLote.push(new FuncaoDados().copyFromJSON(funcaoDados));
            });
        }
        this.carregarModuloSistema();
        this.mostrarDialogEditarEmLote = true;
        this.hideShowQuantidade = true;
    }

    fecharDialogEditarEmLote() {
        this.evidenciaEmLote = null;
        this.classificacaoEmLote = null;
        this.deflatorEmLote = null;
        this.moduloSelecionadoEmLote = null;
        this.funcionalidadeSelecionadaEmLote = null;
        this.quantidadeEmLote = null;
        this.arquivosEmLote = []
        this.mostrarDialogEditarEmLote = false;
        this.funcaoDadosEmLote = [];
    }

    editarCamposEmLote() {
        if (this.funcionalidadeSelecionadaEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.funcionalidade = this.funcionalidadeSelecionadaEmLote;
            });
        }
        if (this.classificacaoEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.tipo = this.classificacaoEmLote;
            })
        }
        if (this.deflatorEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.fatorAjuste = this.deflatorEmLote;
            })
        }
        if (this.evidenciaEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.sustantation = this.evidenciaEmLote;
            })
        }
        if (this.arquivosEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.files = this.arquivosEmLote;
            })
        }
        if (this.quantidadeEmLote) {
            this.funcaoDadosEmLote.forEach(funcaoDado => {
                funcaoDado.quantidade = this.quantidadeEmLote;
            })
        }
    }

    editarEmLote() {
        if (!this.funcionalidadeSelecionadaEmLote &&
            !this.classificacaoEmLote &&
            !this.deflatorEmLote &&
            !this.evidenciaEmLote &&
            !this.arquivosEmLote) {
            return this.pageNotificationService.addErrorMessage("Para editar em lote, selecione ao menos um campo para editar.")
        }
        if (this.deflatorEmLote && this.deflatorEmLote.tipoAjuste === 'UNITARIO' && !this.quantidadeEmLote) {
            return this.pageNotificationService.addErrorMessage("Coloque uma quantidade para o deflator!")
        }
        if (this.moduloSelecionadoEmLote && !this.funcionalidadeSelecionadaEmLote) {
            return this.pageNotificationService.addErrorMessage("Escolha uma funcionalidade para prosseguir!");
        }
        this.editarCamposEmLote();
        let moduloSelecionado;
        if (this.moduloSelecionadoEmLote) {
            moduloSelecionado = this.moduloSelecionadoEmLote;
        }

        for (let i = 0; i < this.funcaoDadosEmLote.length; i++) {
            let funcaoDado = this.funcaoDadosEmLote[i];
            funcaoDado = new FuncaoDados().copyFromJSON(funcaoDado);
            const funcaoDadosCalculada = Calculadora.calcular(
                this.analise.metodoContagem, funcaoDado, this.analise.contrato.manual);
            this.funcaoDadosService.update(funcaoDadosCalculada, funcaoDadosCalculada.files?.map(item => item.logo)).subscribe(value => {
                this.funcoesDados = this.funcoesDados.filter((funcaoDados) => (funcaoDados.id !== funcaoDadosCalculada.id));
                if (moduloSelecionado) {
                    funcaoDadosCalculada.funcionalidade.modulo = moduloSelecionado;
                }
                this.setFields(funcaoDadosCalculada);
                this.funcoesDados.push(funcaoDadosCalculada);
                this.funcoesDados.sort((a, b) => a.ordem - b.ordem);
                this.analiseService.updateSomaPf(this.analise.id).subscribe();
                this.resetarEstadoPosSalvar();
            });
        }
        this.pageNotificationService.addSuccessMessage("Funções de dados editadas com sucesso!")
        this.fecharDialogEditarEmLote();
    }

    moduloSelecionado(modulo: Modulo) {
        this.moduloSelecionadoEmLote = modulo;
    }

    funcionalidadeSelecionada(funcionalidade: Funcionalidade) {
        this.funcionalidadeSelecionadaEmLote = funcionalidade;
    }



    selecionarDeflatorEmLote(deflator: FatorAjuste) {
        if (deflator.tipoAjuste === 'UNITARIO') {
            this.hideShowQuantidade = false;
        } else {
            this.hideShowQuantidade = true;
        }
    }


    carregarModuloSistema() {
        this.sistemaService.find(this.analise.sistema.id).subscribe((sistemaRecarregado: Sistema) => {
            this.modulos = sistemaRecarregado.modulos;
            this.analise.sistema = sistemaRecarregado;
            this.analiseSharedDataService.analise.sistema = sistemaRecarregado;
        });
    }

    exibeComponenteModuloFuncionalidade() {
        if ((!this.isEdit || this.seletedFuncaoDados.id) && this.modulos) {
            return true;
        }
        return false;
    }

    onUpload(event) {
        for (let i = 0; i < event.currentFiles.length; i++) {
            let file: Upload = new Upload();
            file.originalName = event.currentFiles[i].name;
            file.logo = event.currentFiles[i];
            file.sizeOf = event.currentFiles[i].size;
            file.safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(event.currentFiles[i]));
            if (this.seletedFuncaoDados.id != undefined) {
                this.seletedFuncaoDados.files.push(file);
            } else if (this.funcaoDadosEmLote.length > 0) {
                this.arquivosEmLote.push(file);
            }
        }
        event.currentFiles = [];
        this.componenteFile.files = [];
    }

    confirmDeleteFileUpload(file: Upload) {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir o arquivo?',
            accept: () => {
                if (this.seletedFuncaoDados.id != undefined) {
                    this.seletedFuncaoDados.files.splice(this.seletedFuncaoDados.files.indexOf(file), 1);
                } else if (this.funcaoDadosEmLote.length > 0) {
                    this.arquivosEmLote.splice(this.arquivosEmLote.indexOf(file), 1);
                }
            }
        });
    }

    carregarArquivos() {
        this.seletedFuncaoDados.files.forEach(file => {
            file.safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(Utilitarios.base64toFile(file.logo, "image/png", file.originalName)));
            file.logo = Utilitarios.base64toFile(file.logo, "image/png", file.originalName);
        })
    }

    public handlePaste(event: ClipboardEvent): void {
        let uploadFile = new Upload();
        let num: number = 0;
        var pastedImage = this.getPastedImage(event);
        if (!pastedImage) {
            return;
        }
        if (this.lastObjectUrl) {
            URL.revokeObjectURL(this.lastObjectUrl);
        }
        this.lastObjectUrl = URL.createObjectURL(pastedImage);
        uploadFile.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.lastObjectUrl);
        uploadFile.logo = new File([event.clipboardData.files[0]], uploadFile.originalName, { type: event.clipboardData.files[0].type });
        uploadFile.sizeOf = event.clipboardData.files[0].size;
        if (this.seletedFuncaoDados.id != undefined) {
            num = this.seletedFuncaoDados.files.length + 1
            uploadFile.originalName = "Evidência " + num;
            this.seletedFuncaoDados.files.push(uploadFile);
        } else if (this.funcaoDadosEmLote.length > 0) {
            num = this.arquivosEmLote.length + 1;
            uploadFile.originalName = "Evidência " + num;
            this.arquivosEmLote.push(uploadFile);
        }

    }

    private getPastedImage(event: ClipboardEvent): File | null {
        if (
            event.clipboardData &&
            event.clipboardData.files &&
            event.clipboardData.files.length &&
            this.isImageFile(event.clipboardData.files[0])
        ) {
            return (event.clipboardData.files[0]);
        }
        return (null);
    }


    private isImageFile(file: File): boolean {
        const res = file.type.search(/^image\//i) === 0;
        return (res);
    }

    refreshFuncoes() {
        this.funcoesDados.sort((a, b) => a.id - b.id);
        this.updateIndex();
    }

    public updateIndex() {
        let temp = 1
        for (let i = 0; i < this.funcoesDados.length; i++) {
            this.funcoesDados[i].ordem = temp
            temp++
        }
    }

    public orderList(botao: String) {
        let i;
        let del;

        this.funcoesDados.forEach((item, index) => {
            if (item.id === this.funcaoDadosEditar[0].id) {
                i = index;
                del = i
            }
        })

        if (botao == 'order-top' && this.funcaoDadosEditar[0] != null) {
            if (i == 0) {
                return
            } else {
                this.funcoesDados.splice(del, 1);
                this.funcoesDados.unshift(this.funcaoDadosEditar[0]);
            }
        }

        if (botao == 'order-up' && this.funcaoDadosEditar != null) {
            if (i == 0) {
                return
            } else {
                let pos = i - 1
                this.funcoesDados.splice(del, 1)
                this.funcoesDados.splice(pos, 0, this.funcaoDadosEditar[0])
            }
        }

        if (botao == 'order-down' && this.funcaoDadosEditar[0] != null) {
            if (i == this.funcoesDados.length - 1) {
                return
            } else {
                let pos = i + 1;
                this.funcoesDados.splice(del, 1);
                this.funcoesDados.splice(pos, 0, this.funcaoDadosEditar[0]);
            }
        }

        if (botao == 'order-botton' && this.funcaoDadosEditar[0] != null) {
            if (i == this.funcoesDados.length - 1) {
                return
            }
            this.funcoesDados.splice(del, 1);
            this.funcoesDados.push(this.funcaoDadosEditar[0]);
        }
        this.updateIndex()

    }

    ordernarFuncoes() {
        this.isOrderning = true;
    }

    salvarOrdernacao() {
        this.funcoesDados.forEach((funcaoDado, index) => {
            funcaoDado.ordem = index + 1;
            this.funcaoDadosService.updateOrdem(funcaoDado).subscribe();
        })
        this.pageNotificationService.addSuccessMessage("Ordenação salva com sucesso.");
        this.isOrderning = false;
    }

    // Funcionalidade Selecionada
    funcionalidadeSelected(funcionalidade: Funcionalidade) {
        for (let i = 0; i < this.funcionalidades.length; i++) {
            const funcionalidadeFor = this.funcionalidades[i];
            if (funcionalidadeFor.id === funcionalidade.id) {
                this.seletedFuncaoDados.funcionalidade = funcionalidadeFor;
                this.seletedFuncaoDados.funcionalidade.modulo = this.seletedFuncaoDados.modulo;
            }
        }
        this.carregarDadosBaseline();
    }

    moduloSelected(modulo: Modulo) {
        for (let i = 0; i < this.modulos.length; i++) {
            const moduloFor = this.modulos[i];
            if (moduloFor.id === modulo.id) {
                this.seletedFuncaoDados.modulo = moduloFor;
            }
        }
        this.deselecionaFuncionalidadesSeModuloForDiferente();
        this.funcionalidadeService.findFuncionalidadesDropdownByModulo(this.seletedFuncaoDados.modulo.id).subscribe((funcionalidades: Funcionalidade[]) => {
            this.funcionalidades = funcionalidades;
            this.selecionaFuncionalidadeFromCurrentAnalise(this.seletedFuncaoDados.modulo);
            this.oldModuloId = modulo.id;
        });
    }
    selecionaFuncionalidadeFromCurrentAnalise(modulo: any) {
        if (this.seletedFuncaoDados.funcionalidade) {
            this.funcionalidadeSelected(this.seletedFuncaoDados.funcionalidade);
        }
    }

    deselecionaFuncionalidadesSeModuloForDiferente() {
        if (this.oldModuloId != undefined || this.oldModuloId != null) {
            if (this.oldModuloId !== this.seletedFuncaoDados.modulo.id) {
                this.funcionalidades = [];
                this.seletedFuncaoDados.funcionalidade = undefined;
            }
        }
    }

    isModuloSelected() {
        return this.seletedFuncaoDados.modulo != null;
    }

    private moduloSelecionadoTemFuncionalidade(): boolean {
        return this.seletedFuncaoDados.modulo.funcionalidades && this.seletedFuncaoDados.modulo.funcionalidades.length > 0;
    }

    funcionalidadeDropdownPlaceholder() {
        if (this.isModuloSelected()) {
            return this.funcionalidadeDropdownPlaceHolderComModuloSelecionado();
        } else {
            return this.getLabel('Selecione um Módulo para carregar as Funcionalidades');
        }
    }

    private funcionalidadeDropdownPlaceHolderComModuloSelecionado(): string {
        if (this.moduloSelecionadoTemFuncionalidade()) {
            return this.getLabel('Selecione uma Funcionalidade');
        } else {
            return this.getLabel('Nenhuma Funcionalidade Cadastrada');
        }
    }
    moduloName() {
        if (this.isModuloSelected()) {
            return this.seletedFuncaoDados.modulo.nome;
        }
    }

    abrirDialogModulo() {
        this.mostrarDialogAddModulo = true;
    }
    abrirDialogFuncionalidade() {
        this.mostrarDialogAddFuncionalidade = true;
    }
    fecharDialogModulo() {
        this.mostrarDialogAddModulo = false;
        this.novoModulo = new Modulo();
    }
    fecharDialogFuncionalidade() {
        this.mostrarDialogAddFuncionalidade = false;
        this.novaFuncionalidade = new Funcionalidade();
    }

    adicionarModulo() {
        if (!this.novoModulo.nome) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return;
        }
        this.moduloService.create(this.novoModulo, this.analise.sistema.id).subscribe(moduloCriado => {
            this.modulos.push(moduloCriado);
            this.moduloSelected(moduloCriado);
            this.criarMensagemDeSucessoDaCriacaoDoModulo(moduloCriado.nome, this.analise.sistema.nome);
            this.fecharDialogModulo();
            this.carregarModuloSistema();
        })
    }

    adicionarFuncionalidade() {
        if (this.novaFuncionalidade.nome === undefined) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return;
        }
        this.funcionalidadeService.create(this.novaFuncionalidade, this.seletedFuncaoDados.modulo.id).subscribe(funcionalidadeCriada => {
            this.seletedFuncaoDados.funcionalidade = funcionalidadeCriada;
            this.moduloSelected(this.seletedFuncaoDados.modulo);
            this.criarMensagemDeSucessoDaCriacaoDaFuncionalidade(funcionalidadeCriada.nome, this.seletedFuncaoDados.modulo.nome, this.analise.sistema.nome);
            this.fecharDialogFuncionalidade();
        })
    }

    private criarMensagemDeSucessoDaCriacaoDaFuncionalidade(nomeFunc: string, nomeModulo: string, nomeSistema: string) {
        this.pageNotificationService
            .addSuccessMessage(`${this.getLabel('Funcionalidade ')} ${nomeFunc} ${this.getLabel(' criado no módulo ')} ${nomeModulo} ${this.getLabel(' do Sistema ')} ${nomeSistema}`);
    }

    private criarMensagemDeSucessoDaCriacaoDoModulo(nomeModulo: string, nomeSistema: string) {
        this.pageNotificationService
            .addSuccessMessage(`${this.getLabel('Módulo ')} ${nomeModulo} ${this.getLabel(' criado para o Sistema')} ${nomeSistema}`);
    }
}
