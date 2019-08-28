import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs/Rx';

import { FaseService, Fase } from '../';
import { PageNotificationService } from '../../shared';

@Component({
    selector: 'jhi-tipo-fase-form',
    templateUrl: './fase-form.component.html'
})
export class FaseFormComponent implements OnInit {
    fase: Fase = new Fase();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private tipoFaseService: FaseService,
        private pageNotificationService: PageNotificationService,
        private translate: TranslateService
    ) {
    }

    private showTranslatedMessage(label) {
        this.translate.get(label).subscribe((translatedMessage: string) => {
            this.pageNotificationService.addErrorMsg(translatedMessage);
        });
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.tipoFaseService.find(params['id']).subscribe(fase => this.fase = fase);
            }
        });
    }

    save(form) {
        if (!form.valid) {
            this.showTranslatedMessage('Global.Mensagens.FavorPreencherCampoObrigatorio');
            return;
        }
        this.tipoFaseService.create(this.fase).subscribe(() => {
            this.router.navigate(['/fase']);
            (this.fase.id === undefined) ? (this.pageNotificationService.addCreateMsg()) :
            (this.pageNotificationService.addUpdateMsg());
        });
    }
   
}
