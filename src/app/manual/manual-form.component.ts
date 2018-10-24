import {Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Response} from '@angular/http';
import {Observable, Subscription} from 'rxjs/Rx';

import {Manual} from './manual.model';
import {ManualService} from './manual.service';
import {EsforcoFaseService} from '../esforco-fase/esforco-fase.service';
import {ResponseWrapper} from '../shared';
import {EsforcoFase} from '../esforco-fase/esforco-fase.model';
import {TipoFaseService} from '../tipo-fase/tipo-fase.service';
import {TipoFase} from '../tipo-fase/tipo-fase.model';
import {DatatableClickEvent} from '@basis/angular-components';
import {ConfirmationService} from 'primeng/components/common/confirmationservice';
import {FatorAjuste, TipoFatorAjuste} from '../fator-ajuste/fator-ajuste.model';
import {PageNotificationService} from '../shared/page-notification.service';
import {UploadService} from '../upload/upload.service';
import {FileUpload} from 'primeng/primeng';

@Component({
    selector: 'jhi-manual-form',
    templateUrl: './manual-form.component.html',
})
export class ManualFormComponent implements OnInit, OnDestroy {
    manual: Manual;
    isSaving;
    isEdit: boolean;
    loading: boolean;
    private routeSub: Subscription;
    arquivoManual: File;
    esforcoFases: Array<EsforcoFase>;
    showDialogPhaseEffort = false;
    showDialogEditPhaseEffort = false;
    showDialogCreateAdjustFactor = false;
    showDialogEditAdjustFactor = false;
    tipoFases: Array<TipoFase> = [];
    percentual: number;
    newPhaseEffort: EsforcoFase = new EsforcoFase();
    editedPhaseEffort: EsforcoFase = new EsforcoFase();
    newAdjustFactor: FatorAjuste = new FatorAjuste();
    editedAdjustFactor: FatorAjuste = new FatorAjuste();

    adjustTypes: Array<any> = [
        {label: 'Percentual', value: 'PERCENTUAL',},
        {label: 'Unitário', value: 'UNITARIO',},
    ];

    invalidFields: Array<string> = [];

    @ViewChild('fileInput') fileInput: FileUpload;
    tipoFaseValid = false;
    esforcoValid = false;

    /**
     *
     */
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private manualService: ManualService,
        private esforcoFaseService: EsforcoFaseService,
        private tipoFaseService: TipoFaseService,
        private confirmationService: ConfirmationService,
        private pageNotificationService: PageNotificationService,
        private uploadService: UploadService
    ) {
    }

    ngOnInit() {
        this.isSaving = false;
        this.routeSub = this.route.params.subscribe(params => {
            this.manual = new Manual();
            this.manual.fatoresAjuste = [];
            this.manual.esforcoFases = [];
            if (params['id']) {
                this.manualService.find(params['id']).subscribe(manual => {
                    this.manual = manual;
                    this.getFile();
                });
            }
        });

        this.tipoFaseService.query().subscribe((response: ResponseWrapper) => {
            this.tipoFases = response.json;
        });
        this.manual.versaoCPM = 431;
    }

    /**
     *
     */
    save(form: any) {
        if (!this.checkRequiredFields()) {
            this.pageNotificationService.addErrorMsg('Favor preencher os campos obrigatórios!');
            return;
        }

        this.isSaving = true;
        this.manualService.query().subscribe(response => {
            const todosManuais = response;

            if (!this.checkIfManualAlreadyExists(todosManuais.json)) {
                if (this.manual.id !== undefined) {
                    this.editar();
                } else {
                    this.novo();
                }
            }
        });
    }

    private checkIfManualAlreadyExists(registeredPhases: Array<TipoFase>): boolean {
        let isAlreadyRegistered = false;
        registeredPhases.forEach(each => {
            if (each.nome.toUpperCase() === this.manual.nome.toUpperCase() && each.id !== this.manual.id) {
                isAlreadyRegistered = true;
                this.pageNotificationService.addErrorMsg('Já existe um Manual registrado com este nome!');
            }
        });
        return isAlreadyRegistered;
    }

    private editar() {
        this.manualService.find(this.manual.id).subscribe(() => {
            if (this.checkRequiredFields()) {
                if (this.arquivoManual !== undefined) {
                    this.uploadService.uploadFile(this.arquivoManual).subscribe(response => {
                        this.manual.arquivoManualId = JSON.parse(response['_body']).id;
                        this.isEdit = true;
                        this.subscribeToSaveResponse(this.manualService.update(this.manual));
                    });
                } else {
                    this.isEdit = true;
                    this.subscribeToSaveResponse(this.manualService.update(this.manual));
                }
            } else {
                this.privateExibirMensagemCamposInvalidos(1);
            }
        });
    }

    private novo() {

        if (this.arquivoManual !== undefined) {
            if (this.checkRequiredFields()) {
                this.uploadService.uploadFile(this.arquivoManual).subscribe(response => {
                    this.manual.arquivoManualId = JSON.parse(response['_body']).id;
                    this.subscribeToSaveResponse(this.manualService.create(this.manual));
                });
            } else {
                this.privateExibirMensagemCamposInvalidos(1);
            }
        } else if (this.checkRequiredFields()) {
            this.subscribeToSaveResponse(this.manualService.create(this.manual));
        } else {
            this.privateExibirMensagemCamposInvalidos(1);
        }
    }

    private checkRequiredFields(): boolean {
        this.invalidFields = [];
        let isFieldsValid = false;

        if (!this.manual.valorVariacaoEstimada || this.manual.valorVariacaoEstimada === undefined) {
            this.invalidFields.push('Valor Variação Estimada');
        }
        if (!this.manual.valorVariacaoIndicativa || this.manual.valorVariacaoIndicativa === undefined) {
            this.invalidFields.push('Valor Variação Indicativa');
        }
        if (!this.manual.nome || this.manual.nome === undefined) {
            this.invalidFields.push('Nome');
        }
        if (!this.manual.parametroInclusao || this.manual.parametroInclusao === undefined) {
            this.invalidFields.push('Inclusão');
        }
        if (!this.manual.parametroAlteracao || this.manual.parametroAlteracao === undefined) {
            this.invalidFields.push('Alteração');
        }
        if (!this.manual.parametroExclusao || this.manual.parametroExclusao === undefined) {
            this.invalidFields.push('Exclusão');
        }
        if (!this.manual.parametroConversao || this.manual.parametroConversao === undefined) {
            this.invalidFields.push('Conversão');
        }

        if (this.manual.esforcoFases.length === 0 || this.manual.esforcoFases === undefined) {
            document.getElementById('tabela-tipo-fase').setAttribute('style', 'border: 1px dotted red;');
            this.invalidFields.push('Esforço de Fases');
        }

        if (this.manual.fatoresAjuste.length === 0 || this.manual.fatoresAjuste === undefined) {
            document.getElementById('tabela-deflator').setAttribute('style', 'border: 1px dotted red;');
            this.invalidFields.push('Deflator');
        }

        isFieldsValid = (this.invalidFields.length === 0);

        return isFieldsValid;
    }

    privateExibirMensagemCamposInvalidos(codErro: number) {
        switch (codErro) {
            case 1:
                this.pageNotificationService.addErrorMsg('Campos inválidos: ' + this.getInvalidFieldsString());
                this.invalidFields = [];
                return;
            case 2:
                this.pageNotificationService.addErrorMsg('Campo Arquivo Manual está inválido!');
                return;
        }
    }

    private getInvalidFieldsString(): string {
        let invalidFieldsString = '';

        this.invalidFields.forEach(invalidField => {
            if (invalidField === this.invalidFields[this.invalidFields.length - 1]) {
                invalidFieldsString = invalidFieldsString + invalidField;
            } else {
                invalidFieldsString = invalidFieldsString + invalidField + ', ';
            }
        });

        return invalidFieldsString;
    }

    private subscribeToSaveResponse(result: Observable<Manual>) {
        result.subscribe((res: Manual) => {
                this.isSaving = false;
                this.router.navigate(['/manual']);
                this.isEdit ? this.pageNotificationService.addUpdateMsg() : this.pageNotificationService.addCreateMsg();
            },
            (error: Response) => {
                this.isSaving = false;

                if (error.headers.toJSON()['x-abacoapp-error'][0] === 'error.manualexists') {
                    this.pageNotificationService.addErrorMsg('Já existe um Manual registrado com este nome!');
                    document.getElementById('nome_manual').setAttribute('style', 'border-color: red;');
                }
            });
    }

    ngOnDestroy() {
        this.routeSub.unsubscribe();
    }

    uploadFile(event: any) {
        this.arquivoManual = event.files[0];
    }

    datatableClick(event: DatatableClickEvent) {
        if (!event.selection) {
            return;
        }
        switch (event.button) {
            case 'edit':
                this.editedPhaseEffort = event.selection.clone();
                this.openDialogEditPhaseEffort();
                break;
            case 'delete':
                this.editedPhaseEffort = event.selection.clone();
                this.confirmDeletePhaseEffort();
        }
    }

    adjustFactorDatatableClick(event: DatatableClickEvent) {
        if (!event.selection) {
            return;
        }
        switch (event.button) {
            case 'edit':
                this.editedAdjustFactor = event.selection.clone();
                (this.editedAdjustFactor.fator > 0 && this.editedAdjustFactor.fator < 1) ?
                    (this.editedAdjustFactor.fator = this.editedAdjustFactor.fator) : (this.editedAdjustFactor = this.editedAdjustFactor);
                this.openDialogEditAdjustFactor();
                break;
            case 'delete':
                this.editedAdjustFactor = event.selection.clone();
                this.confirmDeleteAdjustFactor();
        }
    }

    isPercentualEnum(value: TipoFatorAjuste) {
        return (value !== undefined) ? (value.toString() === 'PERCENTUAL') : (false);
    }

    isUnitaryEnum(value: TipoFatorAjuste) {
        return (value !== undefined) ? (value.toString() === 'UNITARIO') : (false);
    }

    confirmDeletePhaseEffort() {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir o Esforço por fase ' + this.editedPhaseEffort.fase.nome + '?',
            accept: () => {
                this.manual.deleteEsforcoFase(this.editedPhaseEffort);
                this.pageNotificationService.addDeleteMsg();
                this.editedPhaseEffort = new EsforcoFase();
            }
        });
    }

    confirmDeleteAdjustFactor() {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir o Fator de Ajuste ' + this.editedAdjustFactor.nome + '?',
            accept: () => {
                this.manual.deleteFatoresAjuste(this.editedAdjustFactor);
                this.pageNotificationService.addDeleteMsg();
                this.editedAdjustFactor = new FatorAjuste();
            }
        });
    }

    openDialogPhaseEffort() {
        this.newPhaseEffort = new EsforcoFase();
        this.showDialogPhaseEffort = true;
    }

    openDialogEditPhaseEffort() {
        this.showDialogEditPhaseEffort = true;
    }

    editPhaseEffort(form) {
        if (!form.valid) {
            this.pageNotificationService.addErrorMsg('Favor preencher os campos obrigatórios!');
            return;
        }
        if (this.checkPhaseEffortRequiredFields(this.editedPhaseEffort)) {
            this.manual.updateEsforcoFases(this.editedPhaseEffort);
            //            this.pageNotificationService.addUpdateMsg();
            this.closeDialogEditPhaseEffort();
        } else {
            this.pageNotificationService.addErrorMsg('Favor, preencher os campos obrigatórios!');
        }
    }

    editAdjustFactor() {
        if (this.checkAdjustFactorRequiredFields(this.editedAdjustFactor)) {
            this.manual.updateFatoresAjuste(this.editedAdjustFactor);
            this.pageNotificationService.addUpdateMsg();
            this.closeDialogEditAdjustFactor();
        } else {

        }
    }

    closeDialogPhaseEffort() {
        document.getElementById('tabela-tipo-fase').removeAttribute('style');
        this.newPhaseEffort = new EsforcoFase();
        this.showDialogPhaseEffort = false;
    }

    closeDialogEditPhaseEffort() {
        this.editedPhaseEffort = new EsforcoFase();
        this.showDialogEditPhaseEffort = false;
    }

    addPhaseEffort() {
        this.newPhaseEffort.esforco = this.newPhaseEffort.esforco;
        if (this.checkPhaseEffortRequiredFields(this.newPhaseEffort)) {
            this.manual.addEsforcoFases(this.newPhaseEffort);
            this.pageNotificationService.addCreateMsg();
            this.closeDialogPhaseEffort();
        } else {
            this.pageNotificationService.addErrorMsg('Favor, preencher os campos obrigatórios!');
        }
    }

    private checkPhaseEffortRequiredFields(phaseEffort: EsforcoFase): boolean {
        let isPhaseNameValid = false;
        let isPhaseEffortValid = false;
        let isEffortValid = false;

        (phaseEffort.fase !== undefined) ? (isPhaseNameValid = true) : (isPhaseNameValid = false);

        if (phaseEffort.fase !== undefined) {
            isPhaseNameValid = true;
            this.tipoFaseValid = false;
        } else {
            this.tipoFaseValid = true;
            isPhaseNameValid = false;
        }

        if (phaseEffort.esforco !== undefined && phaseEffort.esforco !== 0) {
            isEffortValid = true;
            this.esforcoValid = false;
        } else {
            isEffortValid = false;
            this.esforcoValid = true;
        }

        (isPhaseNameValid && isEffortValid) ? (isPhaseEffortValid = true) : (isPhaseEffortValid = false);

        return isPhaseEffortValid;
    }

    getPhaseEffortTotalPercentual() {
        let total = 0;
        this.manual.esforcoFases.forEach(each => {
            (each.esforco !== undefined) ? (total = total + each.esforcoFormatado) : (total = total);
        });

        return total;
    }

    openDialogCreateAdjustFactor() {
        this.showDialogCreateAdjustFactor = true;
    }

    closeDialogCreateAdjustFactor() {
        this.showDialogCreateAdjustFactor = false;
        this.newAdjustFactor = new FatorAjuste();
    }

    openDialogEditAdjustFactor() {
        this.showDialogEditAdjustFactor = true;
    }

    closeDialogEditAdjustFactor() {
        this.showDialogEditAdjustFactor = false;
        this.editedAdjustFactor = new FatorAjuste();
    }

    addAdjustFactor() {
        this.newAdjustFactor.ativo = true;
        if (this.checkAdjustFactorRequiredFields(this.newAdjustFactor)) {
            this.manual.addFatoresAjuste(this.newAdjustFactor);
            document.getElementById('tabela-deflator').removeAttribute('style');
            this.pageNotificationService.addCreateMsg('Deflator incluído com sucesso!');
            this.closeDialogCreateAdjustFactor();
        } else {
            this.pageNotificationService.addErrorMsg('Favor, preencher os campos obrigatórios!');
        }
    }

    private checkAdjustFactorRequiredFields(adjustFactor: FatorAjuste): boolean {
        let isNameValid = false;
        let isAdjustTypeValid = false;
        let isFactorValid = false;

        isNameValid = this.checkRequiredField(adjustFactor.nome);
        isAdjustTypeValid = this.checkRequiredField(adjustFactor.tipoAjuste);
        isFactorValid = this.checkRequiredField(adjustFactor.fator);

        return (isNameValid && isAdjustTypeValid && isFactorValid);
    }

    private checkRequiredField(field: any) {
        let isValid = false;

        (field !== undefined && field !== '' && field !== null) ? (isValid = true) : (isValid = false);

        return isValid;
    }

    getFile() {
        this.loading = true;
        this.uploadService.getFile(this.manual.arquivoManualId).subscribe(response => {

            let fileInfo;
            this.uploadService.getFileInfo(this.manual.arquivoManualId).subscribe(response => {
                fileInfo = response;

                this.fileInput.files.push(new File([response['_body']], fileInfo['originalName']));
                this.loading = false;
            });
        });
    }

    getFileInfo() {
        return this.uploadService.getFile(this.manual.arquivoManualId).subscribe(response => {
            return response;
        });
    }

    public habilitarDeflator(): boolean {
        if (this.newAdjustFactor.tipoAjuste !== undefined) {
            return false;
        }
        if (this.editedAdjustFactor.tipoAjuste !== undefined) {
            return false;
        }
        return true;
    }

}
