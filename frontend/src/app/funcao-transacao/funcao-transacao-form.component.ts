import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BlockUiService } from '@nuvem/angular-base';
import { DatatableClickEvent, DatatableComponent, PageNotificationService } from '@nuvem/primeng-components';
import * as _ from 'lodash';

import Quill from 'quill';
import { ConfirmationService, Editor, FileUpload, SelectItem } from 'primeng';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { CalculadoraTransacao, ResumoFuncoes } from 'src/app/analise-shared';
import { AnaliseReferenciavel } from 'src/app/analise-shared/analise-referenciavel';
import { DerChipConverter } from 'src/app/analise-shared/der-chips/der-chip-converter';
import { DerChipItem } from 'src/app/analise-shared/der-chips/der-chip-item';
import { DerTextParser, ParseResult } from 'src/app/analise-shared/der-text/der-text-parser';
import { Der } from 'src/app/der/der.model';
import { FatorAjuste } from 'src/app/fator-ajuste';
import { Funcionalidade, FuncionalidadeService } from 'src/app/funcionalidade';
import { Manual } from 'src/app/manual';
import { Modulo, ModuloService } from 'src/app/modulo';
import { AnaliseSharedDataService } from 'src/app/shared/analise-shared-data.service';
import { FatorAjusteLabelGenerator } from 'src/app/shared/fator-ajuste-label-generator';
import { MessageUtil } from 'src/app/util/message.util';

import { FuncaoTransacao, TipoFuncaoTransacao } from '.';
import { Analise } from '../analise/analise.model';
import { AnaliseService } from '../analise/analise.service';
import { FuncaoDadosService } from '../funcao-dados/funcao-dados.service';
import { Sistema, SistemaService } from '../sistema';
import { Upload } from '../upload/upload.model';
import { Utilitarios } from '../util/utilitarios.util';
import { FuncaoTransacaoService } from './funcao-transacao.service';


@Component({
    selector: 'app-analise-funcao-transacao',
    host: {
        "(window:paste)": "handlePaste($event)"
    },
    templateUrl: './funcao-transacao-form.component.html',
    providers: [ConfirmationService]
})
export class FuncaoTransacaoFormComponent implements OnInit {
    emptySustantion = '<p><br></p>';
    faS: FatorAjuste[] = [];
    textHeader: string;
    @Input() isView: boolean;
    isEdit: boolean;
    isFilter: boolean;
    nomeInvalido;
    classInvalida;
    impactoInvalido: boolean;
    deflatorVazio: boolean;
    hideElementTDTR: boolean;
    hideShowQuantidade: boolean;
    showDialog = false;
    sugestoesAutoComplete: string[] = [];
    windowHeightDialog: any;
    windowWidthDialog: any;
    impactos: string[];
    displayDescriptionDeflator = false;
    display = false;
    moduloCache: Funcionalidade;
    dersChips: DerChipItem[];
    alrsChips: DerChipItem[];
    resumo: ResumoFuncoes;
    fatoresAjuste: SelectItem[] = [];
    funcoesTransacaoList: FuncaoTransacao[] = [];
    funcaoTransacaoEditar: FuncaoTransacao[] = [];
    translateSubscriptions: Subscription[] = [];
    defaultSort = [{ field: 'funcionalidade.nome', order: 1 }];
    impacto: SelectItem[] = [
        { label: 'Inclusão', value: 'INCLUSAO' },
        { label: 'Alteração', value: 'ALTERACAO' },
        { label: 'Exclusão', value: 'EXCLUSAO' },
        { label: 'Conversão', value: 'CONVERSAO' },
        { label: 'Outros', value: 'ITENS_NAO_MENSURAVEIS' }
    ];
    baselineResultados: any[] = [];
    classificacoes: SelectItem[] = [];
    // Carregar Referencial
    disableAba: boolean;
    @Output()
    valueChange: EventEmitter<string> = new EventEmitter<string>();
    parseResult: ParseResult;
    text: string;
    @Input()
    label: string;
    showMultiplos = false;
    @Input() properties: Editor;
    @Input() uploadImagem = true;
    @Input() criacaoTabela = true;
    @ViewChild(DatatableComponent) tables: DatatableComponent;
    viewFuncaoTransacao = false;

    isOrderning: boolean = false;

    public isDisabled = false;

    private fatorAjusteNenhumSelectItem = { label: 'Nenhum', value: undefined };
    public erroModulo: boolean;
    public erroTR: boolean;
    public erroTD: boolean;
    public erroUnitario: boolean;
    public erroDeflator: boolean;

    public modulos: Modulo[];

    public config = {
        extraPlugins: [],
        language: 'pt-br',
        toolbar: [
            'heading', '|', 'bold', 'italic', 'hiperlink', 'underline', 'bulletedList', 'numberedList', 'alignment', 'blockQuote', '|',
            'imageUpload', 'insertTable', 'imageStyle:side', 'imageStyle:full', 'mediaEmbed', '|', 'undo', 'redo'
        ],
        heading: {
            options: [
                { model: 'paragraph', title: 'Parágrafo', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' }
            ]
        },
        alignment: {
            options: ['left', 'right', 'center', 'justify']
        },
        image: {
            toolbar: []
        },
        table: {
            contentToolbar: [
                'tableColumn',
                'tableRow',
                'mergeTableCells'
            ]
        }
    };
    private idAnalise: Number;
    public analise: Analise;
    public funcoesTransacoes: FuncaoTransacao[];
    public currentFuncaoTransacao: FuncaoTransacao = new FuncaoTransacao();


    selectButtonMultiple: boolean;

    mostrarDialogEditarEmLote: boolean = false;
    funcionalidadeSelecionadaEmLote: Funcionalidade;
    moduloSelecionadoEmLote: Modulo;
    classificacaoEmLote: TipoFuncaoTransacao;
    deflatorEmLote: FatorAjuste;
    evidenciaEmLote: string;
    arquivosEmLote: Upload[] = [];
    quantidadeEmLote: number;
    funcaoTransacaoEmLote: FuncaoTransacao[] = [];

    private sanitizer: DomSanitizer;
    private lastObjectUrl: string;
    @ViewChild(FileUpload) componenteFile: FileUpload;

    funcionalidades: Funcionalidade[] = [];
    mostrarDialogAddModulo: boolean = false;
    mostrarDialogAddFuncionalidade: boolean = false;
    novoModulo: Modulo = new Modulo();
    novaFuncionalidade: Funcionalidade = new Funcionalidade();
    oldModuloId: number;


    //Variável para o p-editor
    formatsEditor = ["background", "bold", "color", "font", "code", "italic",
        "link", "size", "strike", "script", "underline", "blockquote",
        "header", "indent", "list", "align", "direction", "code-block"]


    constructor(
        private analiseSharedDataService: AnaliseSharedDataService,
        private confirmationService: ConfirmationService,
        private pageNotificationService: PageNotificationService,
        private changeDetectorRef: ChangeDetectorRef,
        private funcaoDadosService: FuncaoDadosService,
        private analiseService: AnaliseService,
        private funcaoTransacaoService: FuncaoTransacaoService,
        private router: Router,
        private route: ActivatedRoute,
        private blockUiService: BlockUiService,
        private sistemaService: SistemaService,
        private funcionalidadeService: FuncionalidadeService,
        private moduloService: ModuloService,
        sanitizer: DomSanitizer,
    ) {
        this.sanitizer = sanitizer;
        this.lastObjectUrl = "";
    }
    getLabel(label) {
        return label;
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.blockUiService.show();
            this.idAnalise = params['id'];
            this.isView = params['view'] !== undefined;
            this.funcaoTransacaoService.getVwFuncaoTransacaoByIdAnalise(this.idAnalise).subscribe(value => {
                this.funcoesTransacoes = value;
                let temp = 1
                for (let i = 0; i < this.funcoesTransacoes.length; i++) {
                    if (this.funcoesTransacoes[i].ordem === null) {
                        this.funcoesTransacoes[i].ordem = temp
                    }
                    temp++
                }
                this.funcoesTransacoes.sort((a, b) => a.ordem - b.ordem);
                if (!this.isView) {
                    this.analiseService.find(this.idAnalise).subscribe(analise => {
                        this.analise = analise;
                        this.analiseSharedDataService.analise = analise;
                        this.carregarModuloSistema();
                        this.disableAba = this.analise.metodoContagem === MessageUtil.INDICATIVA;
                        this.hideShowQuantidade = true;
                        this.currentFuncaoTransacao = new FuncaoTransacao();
                        this.estadoInicial();
                        this.initClassificacoes();
                        this.blockUiService.hide();
                    });
                }
            });
        });
    }

    estadoInicial() {
        this.analiseSharedDataService.funcaoAnaliseDescarregada();
        this.currentFuncaoTransacao = new FuncaoTransacao();
        this.dersChips = [];
        this.alrsChips = [];
        this.traduzirImpactos();
        this.subscribeDisplay();
        this.inicializaFatoresAjuste(this.analise.manual);
    }

    sortColumn(event: any) {
        this.funcoesTransacoes.sort((a, b) => {
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
        if (event.order < 0) {
            this.funcoesTransacoes = this.funcoesTransacoes.reverse();
        }
    }

    sortByComposityField(a: FuncaoTransacao, b: FuncaoTransacao, field: string, composity: string) {
        if (a[field][composity] > b[field][composity]) {
            return 1;
        } else if (a[field][composity] < b[field][composity]) {
            return -1;
        }
        return 0;
    }

    sortByComposityField2(a: FuncaoTransacao, b: FuncaoTransacao, field: string, composity: string, composity2: string) {
        if (a[field][composity][composity2] > b[field][composity][composity2]) {
            return 1;
        } else if (a[field][composity][composity2] < b[field][composity][composity2]) {
            return -1;
        }
        return 0;
    }

    sortByBinary(a: FuncaoTransacao, b: FuncaoTransacao, field: string): number {
        if (a[field] === true && b[field] === false) {
            return 1;
        } else if (a[field] === false && b[field] === true) {
            return -1;
        }
        return 0;
    }

    sortByField(a: FuncaoTransacao, b: FuncaoTransacao, field: string): number {
        if (a[field] > b[field]) {
            return 1;
        } else if (a[field] < b[field]) {
            return -1;
        }
        return 0;
    }

    private subscribeDisplay() {
        this.funcaoTransacaoService.display$.subscribe(
            (data: boolean) => {
                this.display = data;
            });
    }

    public onRowDblclick(event) {
        if (event.target.nodeName === 'TD') {
            this.abrirEditar();
        } else if (event.target.parentNode.nodeName === 'TD') {
            this.abrirEditar();
        }
    }

    abrirEditar() {
        this.isEdit = true;
        this.prepararParaEdicao(this.funcaoTransacaoEditar[0]);
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

    public onChange(editor: HashChangeEvent) {
        // const data = editor.getData();
        return editor;
    }

    public onReady(eventData) {
    }


    updateImpacto(impacto: string) {
        switch (impacto) {
            case 'INCLUSAO':
                return this.getLabel('Cadastros.FuncaoTransacao.Inclusao');
            case 'ALTERACAO':
                return this.getLabel('Cadastros.FuncaoTransacao.Alteracao');
            case 'EXCLUSAO':
                return this.getLabel('Cadastros.FuncaoTransacao.Exclusao');
            case 'CONVERSAO':
                return this.getLabel('Cadastros.FuncaoTransacao.Conversao');
            default:
                return this.getLabel('Global.Mensagens.Nenhum');
        }
    }

    private initClassificacoes() {
        const classificacoes = Object.keys(TipoFuncaoTransacao).map(k => TipoFuncaoTransacao[k as any]);
        // TODO pipe generico?
        if (classificacoes) {
            classificacoes.forEach(c => {
                this.classificacoes.push({ label: c, value: c });
            });
        }
    }

    public buttonSaveEdit() {
        if (!(this.currentFuncaoTransacao.sustantation)) {
            this.currentFuncaoTransacao.sustantation = document.querySelector('.ql-editor').innerHTML;
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

    multiplos(): boolean {
        const lstFuncaotransacao: FuncaoTransacao[] = [];
        const lstFuncaotransacaoToSave: Observable<Boolean>[] = [];
        const lstFuncaotransacaoWithExist: Observable<Boolean>[] = [];
        let retorno: boolean = this.verifyDataRequire();
        this.desconverterChips();
        this.verificarModulo();
        const funcaoTransacaoCalculada: FuncaoTransacao = CalculadoraTransacao.calcular(this.analise.metodoContagem,
            this.currentFuncaoTransacao,
            this.analise.contrato.manual);
        for (const nome of this.parseResult.textos) {
            lstFuncaotransacaoWithExist.push(
                this.funcaoTransacaoService.existsWithName(
                    nome,
                    this.analise.id,
                    this.currentFuncaoTransacao.funcionalidade.id,
                    this.currentFuncaoTransacao.funcionalidade.modulo.id)
            );
            const funcaoTransacaoMultp: FuncaoTransacao = funcaoTransacaoCalculada.clone();
            funcaoTransacaoMultp.name = nome;
            lstFuncaotransacao.push(funcaoTransacaoMultp);
        }
        forkJoin(lstFuncaotransacaoWithExist).subscribe(respFind => {
            for (const value of respFind) {
                if (value) {
                    this.pageNotificationService.addErrorMessage(this.getLabel('Registro já cadastrado!'));
                    retorno = false;
                    break;
                }
            }
            if (retorno) {
                lstFuncaotransacao.forEach(funcaoTransacaoMultp => {
                    lstFuncaotransacaoToSave.push(this.funcaoTransacaoService.create(funcaoTransacaoMultp, this.analise.id, funcaoTransacaoMultp.files?.map(item => item.logo)));
                });

                forkJoin(lstFuncaotransacaoToSave).subscribe(respCreate => {
                    respCreate.forEach((funcaoDados) => {
                        this.pageNotificationService.addCreateMsg(funcaoDados['name']);
                        const funcaoDadosTable: FuncaoTransacao = new FuncaoTransacao().copyFromJSON(funcaoDados);
                        funcaoDadosTable.funcionalidade = funcaoTransacaoCalculada.funcionalidade;
                        this.setFields(funcaoDadosTable);
                        this.funcoesTransacoes.push(funcaoDadosTable);
                    });
                    this.fecharDialog();
                    this.estadoInicial();
                    this.resetarEstadoPosSalvar();
                    this.analiseService.updateSomaPf(this.analise.id).subscribe();
                    return true;
                });
            } else {
                return false;
            }
        });
        return retorno;
    }

    disableTRDER() {
        this.hideElementTDTR = this.analise.metodoContagem === 'INDICATIVA'
            || this.analise.metodoContagem === 'ESTIMADA';
    }

    getTextDialog() {
        this.textHeader = this.isEdit ?
            this.getLabel('Alterar Função de Transação')
            : this.getLabel('Adicionar Função de Transação');
    }


    /**
     * Este método gera os campos dinâmicos necessários para realizar filtros
     */
    private createPropertiesFlters() {
        this.funcoesTransacoes.forEach(ft => this.setFields(ft));
    }

    private setFields(ft: FuncaoTransacao) {
        return Object.defineProperties(ft, {
            'totalDers': { value: ft.derValue(), writable: true },
            'totalAlrs': { value: ft.ftrValue(), writable: true },
            'deflator': { value: this.formataFatorAjuste(ft.fatorAjuste), writable: true },
            'nomeFuncionalidade': { value: ft.funcionalidade.nome, writable: true },
            'nomeModulo': { value: ft.funcionalidade.modulo.nome, writable: true }
        });
    }

    private get manual() {
        if (this.analise.contrato &&
            this.analise.contrato.manualContrato) {
            return this.analise.contrato.manualContrato[0].manual;
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

    contratoSelecionado() {
        if (this.currentFuncaoTransacao.fatorAjuste && this.currentFuncaoTransacao.fatorAjuste.tipoAjuste === 'UNITARIO') {
            this.hideShowQuantidade = this.currentFuncaoTransacao.fatorAjuste === undefined;
        } else {
            this.currentFuncaoTransacao.quantidade = undefined;
            this.hideShowQuantidade = true;
            this.currentFuncaoTransacao.quantidade = undefined;
        }
    }

    fatoresAjusteDropdownPlaceholder() {
        if (this.isContratoSelected()) {
            return this.getLabel('Selecione um Deflator');
        } else {
            return this.getLabel('Selecione um Contrato na aba Geral para carregar os Deflatores');
        }
    }

    recuperarNomeSelecionado(baselineAnalitico: FuncaoTransacao) {
        this.blockUiService.show();
        this.funcaoTransacaoService.getById(baselineAnalitico.id)
            .subscribe((res: FuncaoTransacao) => {
                res.id = null;
                if (res.fatorAjuste === null) {
                    res.fatorAjuste = undefined;
                }
                res.id = undefined;
                if (res.ders) {
                    res.ders.forEach(ders => {
                        ders.id = undefined;
                    });
                }
                if (res.alrs) {
                    res.alrs.forEach(alrs => {
                        alrs.id = undefined;
                    });
                }
                this.disableTRDER();
                this.configurarDialog();
                this.currentFuncaoTransacao = res;
                this.currentFuncaoTransacao.ordem = this.funcoesTransacoes.length + 1;
                this.carregarValoresNaPaginaParaEdicao(this.currentFuncaoTransacao);
                this.blockUiService.hide();
            });

    }

    searchBaseline(event: { query: string; }): void {
        if (this.currentFuncaoTransacao && this.currentFuncaoTransacao.funcionalidade && this.currentFuncaoTransacao.funcionalidade.id) {
            this.funcaoTransacaoService.autoCompletePEAnalitico(
                event.query, this.currentFuncaoTransacao.funcionalidade.id).subscribe(
                    value => {
                        this.baselineResultados = value;
                    }
                );
        }
    }

    adicionar(): boolean {
        const retorno: boolean = this.verifyDataRequire();

        if (!retorno) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return false;
        } else {
            if (this.currentFuncaoTransacao.fatorAjuste !== undefined) {
                this.desconverterChips();
                this.verificarModulo();
                this.currentFuncaoTransacao = new FuncaoTransacao().copyFromJSON(this.currentFuncaoTransacao);
                const funcaoTransacaoCalculada: FuncaoTransacao = CalculadoraTransacao.calcular(this.analise.metodoContagem,
                    this.currentFuncaoTransacao,
                    this.analise.contrato.manual);
                this.funcaoTransacaoService.existsWithName(
                    this.currentFuncaoTransacao.name,
                    this.analise.id,
                    this.currentFuncaoTransacao.funcionalidade.id,
                    this.currentFuncaoTransacao.funcionalidade.modulo.id)
                    .subscribe(existFuncaoTransaco => {
                        if (!existFuncaoTransaco) {
                            funcaoTransacaoCalculada.ordem = this.funcoesTransacoes.length + 1;
                            this.funcaoTransacaoService.create(funcaoTransacaoCalculada, this.analise.id, funcaoTransacaoCalculada.files?.map(item => item.logo)).subscribe(value => {
                                funcaoTransacaoCalculada.id = value.id;
                                this.pageNotificationService.addCreateMsg(funcaoTransacaoCalculada.name);
                                this.setFields(funcaoTransacaoCalculada);
                                this.funcoesTransacoes.push(funcaoTransacaoCalculada);
                                this.fecharDialog();
                                this.resetarEstadoPosSalvar();
                                this.estadoInicial();
                                this.analiseService.updateSomaPf(this.analise.id).subscribe();
                                return retorno;
                            });
                        } else {
                            this.pageNotificationService.addErrorMessage(
                                this.getLabel('Registro já cadastrado')
                            );
                        }
                    });
            }
        }
    }

    private verifyDataRequire(): boolean {
        let retorno = true;

        if (!(this.currentFuncaoTransacao.name) && !(this.multiplos && this.text)) {
            this.nomeInvalido = true;
            retorno = false;
        } else {
            this.nomeInvalido = false;
        }

        if (!this.currentFuncaoTransacao.fatorAjuste) {
            this.deflatorVazio = true;
            retorno = false;
        } else {
            this.deflatorVazio = false;
        }

        this.classInvalida = this.currentFuncaoTransacao.tipo === undefined;
        if (this.currentFuncaoTransacao.fatorAjuste) {
            if (this.currentFuncaoTransacao.fatorAjuste.tipoAjuste === 'UNITARIO' &&
                !(this.currentFuncaoTransacao.quantidade && this.currentFuncaoTransacao.quantidade > 0)) {
                this.erroUnitario = true;
                retorno = false;
            } else {
                this.erroUnitario = false;
            }
        }

        if (this.analise.metodoContagem === 'DETALHADA' && !(this.currentFuncaoTransacao.fatorAjuste && this.currentFuncaoTransacao.fatorAjuste.tipoAjuste === 'UNITARIO')) {

            if (this.alrsChips.length === 0) {
                this.erroTR = true;
                retorno = false;
            } else {
                this.erroTR = false;
            }

            if (this.dersChips.length === 0) {
                this.erroTD = true;
                retorno = false;
            } else {
                this.erroTD = false;
            }
        }

        if (this.currentFuncaoTransacao.funcionalidade === undefined) {
            this.pageNotificationService.addErrorMessage(
                this.getLabel('Selecione um Módulo e Funcionalidade')
            );
            retorno = false;
        }

        return retorno;
    }

    private desconverterChips() {
        if (this.dersChips != null && this.alrsChips != null) {
            this.currentFuncaoTransacao.ders = DerChipConverter.desconverterEmDers(this.dersChips);
            this.currentFuncaoTransacao.alrs = DerChipConverter.desconverterEmAlrs(this.alrsChips);
        }
    }

    dersReferenciados(ders: Der[]) {
        const dersReferenciadosChips: DerChipItem[] = DerChipConverter.converterReferenciaveis(ders);
        this.dersChips = this.dersChips ? this.dersChips.concat(dersReferenciadosChips) : dersReferenciadosChips;
        this.alrsChips = this.alrsChips ? this.dersChips.concat(dersReferenciadosChips) : dersReferenciadosChips;
    }

    private editar() {
        const retorno: boolean = this.verifyDataRequire();
        if (!retorno) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return;
        } else {
            this.funcaoTransacaoService.existsWithName(
                this.currentFuncaoTransacao.name,
                this.analise.id,
                this.currentFuncaoTransacao.funcionalidade.id,
                this.currentFuncaoTransacao.funcionalidade.modulo.id,
                this.currentFuncaoTransacao.id).subscribe(existFuncaoTransacao => {
                    if (!existFuncaoTransacao) {
                        this.desconverterChips();
                        this.verificarModulo();
                        this.currentFuncaoTransacao = new FuncaoTransacao().copyFromJSON(this.currentFuncaoTransacao);
                        const funcaoTransacaoCalculada = CalculadoraTransacao.calcular(
                            this.analise.metodoContagem, this.currentFuncaoTransacao, this.analise.contrato.manual);
                        this.funcaoTransacaoService.update(funcaoTransacaoCalculada, funcaoTransacaoCalculada.files?.map(item => item.logo)).subscribe(value => {
                            this.funcoesTransacoes = this.funcoesTransacoes.filter((funcaoTransacao) => (
                                funcaoTransacao.id !== funcaoTransacaoCalculada.id
                            ));
                            this.setFields(funcaoTransacaoCalculada);
                            this.funcoesTransacoes.push(funcaoTransacaoCalculada);
                            this.funcoesTransacoes.sort((a, b) => a.ordem - b.ordem);
                            this.resetarEstadoPosSalvar();
                            this.fecharDialog();
                            this.analiseService.updateSomaPf(this.analise.id).subscribe();
                            this.pageNotificationService
                                .addSuccessMessage(`${this.getLabel('Função de Transação')}
                '${funcaoTransacaoCalculada.name}' ${this.getLabel(' alterada com sucesso')}`);
                        });

                    } else {
                        this.pageNotificationService.addErrorMessage(
                            this.getLabel('Registro já cadastrado')
                        );
                    }
                });
        }
    }

    fecharDialog() {
        this.text = undefined;
        this.limparMensagensErros();
        this.showDialog = false;
        this.analiseSharedDataService.funcaoAnaliseDescarregada();
        this.currentFuncaoTransacao = new FuncaoTransacao();
        this.dersChips = [];
        this.alrsChips = [];
        this.componenteFile.files = [];
        this.oldModuloId = undefined;
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
        this.currentFuncaoTransacao = this.currentFuncaoTransacao.clone();

        this.funcoesTransacoes.sort((a, b) => a.ordem - b.ordem);
        this.updateIndex();
        this.currentFuncaoTransacao.artificialId = undefined;
        this.currentFuncaoTransacao.id = undefined;

        if (this.dersChips && this.alrsChips) {
            this.dersChips.forEach(c => c.id = undefined);
            this.alrsChips.forEach(c => c.id = undefined);
        }

    }

    public verificarModulo() {
        if (this.currentFuncaoTransacao.funcionalidade !== undefined) {
            return;
        }
        this.currentFuncaoTransacao.funcionalidade = this.moduloCache;
    }

    classValida() {
        this.classInvalida = false;
    }

    impactoValido() {
        this.impactoInvalido = false;
    }

    clonar() {
        this.disableTRDER();
        this.configurarDialog();
        this.isEdit = false;
        this.prepareToClone(this.funcaoTransacaoEditar[0]);
        this.currentFuncaoTransacao.id = undefined;
        this.currentFuncaoTransacao.artificialId = undefined;
        this.textHeader = this.getLabel('Clonar Função de Transação');
    }

    datatableClick(event: DatatableClickEvent) {
        const button = event.button;
        if (button !== 'filter' && !event.selection) {
            return;
        }

        switch (button) {
            case 'edit':
                this.isEdit = true;
                this.prepararParaEdicao(this.funcaoTransacaoEditar[0]);
                break;
            case 'delete':
                this.confirmDelete(this.funcaoTransacaoEditar);
                break;
            case 'view':
                this.viewFuncaoTransacao = true;
                this.prepararParaVisualizar(this.funcaoTransacaoEditar[0]);
                break;
        }
    }


    private prepararParaEdicao(funcaoTransacaoSelecionada: FuncaoTransacao) {
        this.blockUiService.show();
        this.funcaoTransacaoService.getById(funcaoTransacaoSelecionada.id).subscribe(funcaoTransacao => {
            funcaoTransacao = new FuncaoTransacao().copyFromJSON(funcaoTransacao);
            this.disableTRDER();
            this.currentFuncaoTransacao = funcaoTransacao;
            this.currentFuncaoTransacao.ordem = funcaoTransacaoSelecionada.ordem;
            if (this.currentFuncaoTransacao.fatorAjuste !== undefined) {
                if (this.currentFuncaoTransacao.fatorAjuste.tipoAjuste === 'UNITARIO' && this.faS[0]) {
                    this.hideShowQuantidade = false;
                } else {
                    this.hideShowQuantidade = true;
                }
            }
            this.carregarValoresNaPaginaParaEdicao(this.currentFuncaoTransacao);
            this.configurarDialog();
            this.blockUiService.hide();
        });
    }

    private carregarDersAlrs() {
        this.funcaoTransacaoService.getFuncaoTransacaosCompleta(this.currentFuncaoTransacao.id)
            .subscribe(funcaoTransacao => {
                this.currentFuncaoTransacao = funcaoTransacao;
            });
    }

    // Prepara para clonar
    private prepareToClone(funcaoTransacaoSelecionada: FuncaoTransacao) {
        this.blockUiService.show();
        this.funcaoTransacaoService.getById(funcaoTransacaoSelecionada.id).subscribe(funcaoTransacao => {
            this.disableTRDER();
            this.configurarDialog();
            this.currentFuncaoTransacao = new FuncaoTransacao().copyFromJSON(funcaoTransacao);
            this.currentFuncaoTransacao.id = undefined;
            this.currentFuncaoTransacao.name = this.currentFuncaoTransacao.name + ' - Cópia';
            this.currentFuncaoTransacao.ordem = this.funcoesTransacoes.length + 1;
            this.carregarValoresNaPaginaParaEdicao(this.currentFuncaoTransacao);
            this.pageNotificationService.addInfoMessage(
                `${this.getLabel('Clonando Função de Transação ')} '${this.currentFuncaoTransacao.name}'`
            );
            this.blockUiService.hide();
        });
    }

    private carregarValoresNaPaginaParaEdicao(funcaoTransacaoSelecionada: FuncaoTransacao) {
        this.updateIndex();
        this.funcaoDadosService.mod.next(funcaoTransacaoSelecionada.funcionalidade);
        this.analiseSharedDataService.funcaoAnaliseCarregada();
        this.analiseSharedDataService.currentFuncaoTransacao = funcaoTransacaoSelecionada;
        if (this.analise.metodoContagem !== "ESTIMADA") {
            this.carregarDerEAlr(funcaoTransacaoSelecionada);
        }
        this.carregarFatorDeAjusteNaEdicao(funcaoTransacaoSelecionada);
        this.carregarArquivos();
        this.carregarModuloFuncionalidade(funcaoTransacaoSelecionada);
    }
    carregarModuloFuncionalidade(funcaoTransacaoSelecionada: FuncaoTransacao) {
        //CarregarModulo
        this.moduloSelected(funcaoTransacaoSelecionada.funcionalidade.modulo);

    }

    private carregarFatorDeAjusteNaEdicao(funcaoSelecionada: FuncaoTransacao) {
        this.inicializaFatoresAjuste(this.manual);
        if (funcaoSelecionada.fatorAjuste !== undefined) {
            const item: SelectItem = this.fatoresAjuste.find(selectItem => {
                return selectItem.value && funcaoSelecionada.fatorAjuste.id === selectItem.value['id'];
            });
            if (item && item.value) {
                funcaoSelecionada.fatorAjuste = item.value;
            }
        }

    }

    private carregarDerEAlr(ft: FuncaoTransacao) {
        this.dersChips = this.loadReference(ft.ders, ft.derValues);
        this.alrsChips = this.loadReference(ft.alrs, ft.ftrValues);
    }

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
        this.showDialog = false;
        this.fecharDialog();
    }


    confirmDelete(funcaoTransacaoSelecionada: FuncaoTransacao[]) {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir as funções de transações selecionada?',
            accept: () => {
                funcaoTransacaoSelecionada.forEach((funcaoTransacao) => {
                    this.funcaoTransacaoService.delete(funcaoTransacao.id).subscribe(value => {
                        this.funcoesTransacoes = this.funcoesTransacoes.filter((funcaoTransacaoEdit) => (
                            funcaoTransacaoEdit.id !== funcaoTransacao.id
                        ));
                        this.analiseService.updateSomaPf(this.analise.id).subscribe();
                        this.updateIndex();
                    });
                })
                this.pageNotificationService.addDeleteMsg("Funções deletadas com sucesso!");
            }
        });
    }

    formataFatorAjuste(fatorAjuste: FatorAjuste): string {
        return fatorAjuste ? FatorAjusteLabelGenerator.generate(fatorAjuste) : this.getLabel('Nenhum');
    }

    openDialog(param: boolean) {
        this.isEdit = param;
        this.disableTRDER();
        this.configurarDialog();
        this.currentFuncaoTransacao.sustantation = null;
        if (this.currentFuncaoTransacao.fatorAjuste !== undefined) {
            if (this.currentFuncaoTransacao.fatorAjuste.tipoAjuste === 'UNITARIO' && this.faS[0]) {
                this.hideShowQuantidade = false;
            } else {
                this.hideShowQuantidade = true;
            }
        }
    }

    openDialogAdcFT(param: boolean) {
        this.isFilter = param;
        this.configurarDialog();
    }

    configurarDialog() {
        this.getTextDialog();
        this.windowHeightDialog = window.innerHeight * 0.60;
        this.windowWidthDialog = window.innerWidth * 0.50;
        this.showDialog = true;
    }


    private inicializaFatoresAjuste(manual: Manual) {
        if (manual.fatoresAjuste) {
            if (this.analise.manual) {
                this.faS = _.cloneDeep(this.analise.manual.fatoresAjuste);
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
                if (this.isView) {
                    link = ['/analise/' + this.idAnalise + '/funcao-dados/view'];
                } else {
                    link = ['/analise/' + this.idAnalise + '/funcao-dados'];
                }
                break;
            case 2:
                return;
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
        if (this.currentFuncaoTransacao.fatorAjuste) {
            this.displayDescriptionDeflator = true;
        }
    }
    copyToEvidence() {
        if (this.currentFuncaoTransacao.sustantation) {
            this.currentFuncaoTransacao.sustantation =
                this.currentFuncaoTransacao.sustantation +
                this.currentFuncaoTransacao.fatorAjuste.descricao;
        } else {
            this.currentFuncaoTransacao.sustantation = this.currentFuncaoTransacao.fatorAjuste.descricao;
        }
        this.displayDescriptionDeflator = false;
    }
    private prepararParaVisualizar(funcaoTransacaoSelecionada: FuncaoTransacao) {
        this.blockUiService.show();
        this.funcaoTransacaoService.getById(funcaoTransacaoSelecionada.id).subscribe(funcaoTransacao => {
            this.currentFuncaoTransacao = funcaoTransacao;
            this.blockUiService.hide();
        });
    }
    public selectFT(event) {
        if (event.shiftKey === true) {
            let fim = this.funcoesTransacoes.indexOf(this.tables.selectedRow[0]);
            let inicio = this.funcoesTransacoes.indexOf(this.funcaoTransacaoEditar[0]);
            this.tables.selectedRow = [];
            if (inicio < fim) {
                for (let i = inicio; i <= fim; i++) {
                    this.tables.selectedRow.push(this.funcoesTransacoes[i]);
                }
            } else {
                for (let i = fim; i <= inicio; i++) {
                    this.tables.selectedRow.push(this.funcoesTransacoes[i]);
                }
            }
        }
        this.tables.pDatatableComponent.metaKeySelection = true;
        if (this.tables && this.tables.selectedRow) {
            this.funcaoTransacaoEditar = this.tables.selectedRow;
            if (this.tables.selectedRow.length > 1) {
                this.selectButtonMultiple = true;
            }
            else {
                this.selectButtonMultiple = false;
            }
        }
    }
    carregarModuloSistema() {
        this.sistemaService.find(this.analise.sistema.id).subscribe((sistemaRecarregado: Sistema) => {
            this.modulos = sistemaRecarregado.modulos;
            this.analise.sistema = sistemaRecarregado;
            this.analiseSharedDataService.analise.sistema = sistemaRecarregado;
        });
    }

    prepararEditarEmLote() {
        if (this.funcaoTransacaoEditar.length < 2) {
            return this.pageNotificationService.addErrorMessage("Selecione mais de 1 registro para editar em lote.")
        }
        for (let i = 0; i < this.funcaoTransacaoEditar.length; i++) {
            const funcaoTransacaoSelected = this.funcaoTransacaoEditar[i];
            this.funcaoTransacaoService.getById(funcaoTransacaoSelected.id).subscribe(funcaoTransacao => {
                this.funcaoTransacaoEmLote.push(new FuncaoTransacao().copyFromJSON(funcaoTransacao));
            });
        }
        this.carregarModuloSistema();
        this.mostrarDialogEditarEmLote = true;
        this.hideShowQuantidade = true;
        this.arquivosEmLote = [];
    }

    fecharDialogEditarEmLote() {
        this.evidenciaEmLote = null;
        this.classificacaoEmLote = null;
        this.deflatorEmLote = null;
        this.moduloSelecionadoEmLote = null;
        this.quantidadeEmLote = null;
        this.funcionalidadeSelecionadaEmLote = null;
        this.mostrarDialogEditarEmLote = false;
        this.funcaoTransacaoEmLote = [];
        this.hideShowQuantidade = true;
        this.arquivosEmLote = [];
    }

    editarCamposEmLote() {
        if (this.funcionalidadeSelecionadaEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.funcionalidade = this.funcionalidadeSelecionadaEmLote;
            });
        }
        if (this.classificacaoEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.tipo = this.classificacaoEmLote;
            })
        }
        if (this.deflatorEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.fatorAjuste = this.deflatorEmLote;
            })
        }
        if (this.evidenciaEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.sustantation = this.evidenciaEmLote;
            })
        }
        if (this.arquivosEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.files = this.arquivosEmLote;
            })
        }
        if (this.quantidadeEmLote) {
            this.funcaoTransacaoEmLote.forEach(funcaoTransacao => {
                funcaoTransacao.quantidade = this.quantidadeEmLote;
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
        for (let i = 0; i < this.funcaoTransacaoEmLote.length; i++) {
            let funcaoTransacao = this.funcaoTransacaoEmLote[i];
            funcaoTransacao = new FuncaoTransacao().copyFromJSON(funcaoTransacao);
            const funcaoTransacaoCalculada: FuncaoTransacao = CalculadoraTransacao.calcular(
                this.analise.metodoContagem, funcaoTransacao, this.analise.contrato.manual);
            this.funcaoTransacaoService.update(funcaoTransacaoCalculada, funcaoTransacaoCalculada.files?.map(item => item.logo)).subscribe(value => {
                this.funcoesTransacoes = this.funcoesTransacoes.filter((funcaoTransacao) => (funcaoTransacao.id !== funcaoTransacaoCalculada.id));
                if (moduloSelecionado) {
                    funcaoTransacaoCalculada.funcionalidade.modulo = moduloSelecionado;
                }
                this.setFields(funcaoTransacaoCalculada);
                this.funcoesTransacoes.push(funcaoTransacaoCalculada);
                this.funcoesTransacoes.sort((a, b) => a.ordem - b.ordem);
                this.analiseService.updateSomaPf(this.analise.id).subscribe();
                this.resetarEstadoPosSalvar();
            });
        }
        this.pageNotificationService.addSuccessMessage("Funções de transações editadas com sucesso!")
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

    onUpload(event) {
        for (let i = 0; i < event.currentFiles.length; i++) {
            let file: Upload = new Upload();
            file.originalName = event.currentFiles[i].name;
            file.logo = event.currentFiles[i];
            file.sizeOf = event.currentFiles[i].size;
            file.safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(event.currentFiles[i]));
            this.currentFuncaoTransacao.files.push(file);
        }
        event.currentFiles = [];
        this.componenteFile.files = [];
    }

    confirmDeleteFileUpload(file: Upload) {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir o arquivo?',
            accept: () => {
                this.currentFuncaoTransacao.files.splice(this.currentFuncaoTransacao.files.indexOf(file), 1);
            }
        });
    }

    carregarArquivos() {
        this.currentFuncaoTransacao.files.forEach(file => {
            file.safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(Utilitarios.base64toFile(file.logo, "image/png", file.originalName)));
            file.logo = Utilitarios.base64toFile(file.logo, "image/png", file.originalName);
        })
    }

    public handlePaste(event: ClipboardEvent): void {
        let uploadFile = new Upload();
        var pastedImage = this.getPastedImage(event);
        if (!pastedImage) {
            return;
        }
        if (this.lastObjectUrl) {
            URL.revokeObjectURL(this.lastObjectUrl);
        }
        this.lastObjectUrl = URL.createObjectURL(pastedImage);
        uploadFile.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.lastObjectUrl);
        let num: number = this.currentFuncaoTransacao.files.length + 1
        uploadFile.originalName = "Evidência " + num;
        uploadFile.logo = new File([event.clipboardData.files[0]], uploadFile.originalName, { type: event.clipboardData.files[0].type });
        uploadFile.sizeOf = event.clipboardData.files[0].size;
        this.currentFuncaoTransacao.files.push(uploadFile);

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
        this.funcoesTransacoes.sort((a, b) => a.id - b.id);
        this.updateIndex();
    }

    public updateIndex() {
        let temp = 1
        for (let i = 0; i < this.funcoesTransacoes.length; i++) {
            this.funcoesTransacoes[i].ordem = temp
            temp++
        }
    }

    public orderList(botao: String) {

        let i;
        let del;

        this.funcoesTransacoes.forEach((item, index) => {
            if (item.id === this.funcaoTransacaoEditar[0].id) {
                i = index;
                del = i
            }
        })

        if (botao == 'order-top' && this.funcaoTransacaoEditar[0] != null) {
            if (i == 0) {
                return
            } else {
                this.funcoesTransacoes.splice(del, 1);
                this.funcoesTransacoes.unshift(this.funcaoTransacaoEditar[0]);
            }
        }

        if (botao == 'order-up' && this.funcaoTransacaoEditar != null) {
            if (i == 0) {
                return
            } else {
                let pos = i - 1
                this.funcoesTransacoes.splice(del, 1)
                this.funcoesTransacoes.splice(pos, 0, this.funcaoTransacaoEditar[0])
                this.funcoesTransacoes.indexOf(this.funcaoTransacaoEditar[0])
            }
        }

        if (botao == 'order-down' && this.funcaoTransacaoEditar[0] != null) {
            if (i == this.funcoesTransacoes.length - 1) {
                return
            } else {
                let pos = i + 1;
                this.funcoesTransacoes.splice(del, 1);
                this.funcoesTransacoes.splice(pos, 0, this.funcaoTransacaoEditar[0]);
                this.funcoesTransacoes.indexOf(this.funcaoTransacaoEditar[0]);
            }
        }

        if (botao == 'order-botton' && this.funcaoTransacaoEditar[0] != null) {
            if (i == this.funcoesTransacoes.length - 1) {
                return
            }
            this.funcoesTransacoes.splice(del, 1);
            this.funcoesTransacoes.push(this.funcaoTransacaoEditar[0]);
            this.funcoesTransacoes.indexOf(this.funcaoTransacaoEditar[0]);
        }

        this.updateIndex()
    }

    ordernarFuncoes() {
        this.isOrderning = true;
    }

    salvarOrdernacao() {
        this.funcoesTransacoes.forEach((funcaoTransacao, index) => {
            this.funcaoTransacaoService.getById(funcaoTransacao.id).subscribe(funcao => {
                let func: FuncaoTransacao;
                func = new FuncaoTransacao().copyFromJSON(funcao);
                const funcaoTransacao = CalculadoraTransacao.calcular(
                    this.analise.metodoContagem, func, this.analise.contrato.manual);
                funcaoTransacao.ordem = index + 1;
                this.funcaoTransacaoService.update(funcaoTransacao, null).subscribe();
            })
        })
        this.pageNotificationService.addSuccessMessage("Ordenação salva com sucesso.");
        this.isOrderning = false;
    }

    // Funcionalidade Selecionada
    funcionalidadeSelected(funcionalidade: Funcionalidade) {
        for (let i = 0; i < this.funcionalidades.length; i++) {
            const funcionalidadeFor = this.funcionalidades[i];
            if (funcionalidadeFor.id === funcionalidade.id) {
                this.currentFuncaoTransacao.funcionalidade = funcionalidadeFor;
                this.currentFuncaoTransacao.funcionalidade.modulo = this.currentFuncaoTransacao.modulo;
            }
        }
    }

    moduloSelected(modulo: Modulo) {
        for (let i = 0; i < this.modulos.length; i++) {
            const moduloFor = this.modulos[i];
            if (moduloFor.id === modulo.id) {
                this.currentFuncaoTransacao.modulo = moduloFor;
            }
        }
        this.deselecionaFuncionalidadesSeModuloForDiferente();
        this.funcionalidadeService.findFuncionalidadesDropdownByModulo(this.currentFuncaoTransacao.modulo.id).subscribe((funcionalidades: Funcionalidade[]) => {
            this.funcionalidades = funcionalidades;
            this.selecionaFuncionalidadeFromCurrentAnalise(this.currentFuncaoTransacao.modulo);
            this.oldModuloId = modulo.id;
        });
    }
    selecionaFuncionalidadeFromCurrentAnalise(modulo: any) {
        if (this.currentFuncaoTransacao.funcionalidade) {
            this.funcionalidadeSelected(this.currentFuncaoTransacao.funcionalidade);
        }
    }

    deselecionaFuncionalidadesSeModuloForDiferente() {
        if (this.oldModuloId != undefined || this.oldModuloId != null) {
            if (this.oldModuloId !== this.currentFuncaoTransacao.modulo.id) {
                this.funcionalidades = [];
                this.currentFuncaoTransacao.funcionalidade = undefined;
            }
        }
    }
    
    isModuloSelected() {
        return this.currentFuncaoTransacao.modulo != null;
    }

    private moduloSelecionadoTemFuncionalidade(): boolean {
        return this.currentFuncaoTransacao.modulo.funcionalidades && this.currentFuncaoTransacao.modulo.funcionalidades.length > 0;
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
            return this.currentFuncaoTransacao.modulo.nome;
        }
    }

    abrirDialogModulo(){
        this.mostrarDialogAddModulo = true;
    }
    abrirDialogFuncionalidade(){
        this.mostrarDialogAddFuncionalidade = true;
    }
    fecharDialogModulo(){
        this.mostrarDialogAddModulo = false;
        this.novoModulo = new Modulo();
    }
    fecharDialogFuncionalidade(){
        this.mostrarDialogAddFuncionalidade = false;
        this.novaFuncionalidade = new Funcionalidade();
    }

    adicionarModulo(){
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

    adicionarFuncionalidade(){
        if (this.novaFuncionalidade.nome === undefined) {
            this.pageNotificationService.addErrorMessage(this.getLabel('Por favor preencher o campo obrigatório!'));
            return;
        }
        this.funcionalidadeService.create(this.novaFuncionalidade, this.currentFuncaoTransacao.modulo.id).subscribe(funcionalidadeCriada => {
            this.currentFuncaoTransacao.funcionalidade = funcionalidadeCriada;
            this.moduloSelected(this.currentFuncaoTransacao.modulo);
            this.criarMensagemDeSucessoDaCriacaoDaFuncionalidade(funcionalidadeCriada.nome, this.currentFuncaoTransacao.modulo.nome, this.analise.sistema.nome);
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