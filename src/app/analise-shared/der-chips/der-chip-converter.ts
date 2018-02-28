import { DerChipItem } from './der-chip-item';
import { Der } from '../../der/der.model';
import { AnaliseReferenciavel } from '../analise-referenciavel';
import { Rlr } from '../../rlr/rlr.model';

export class DerChipConverter {

  static desconverterEmDers(chips: DerChipItem[]): Der[] {
    return this.desconverter(chips, Der);
  }

  static desconverterEmRlrs(chips: DerChipItem[]): Rlr[] {
    return this.desconverter(chips, Rlr);
  }

  private static desconverter<T extends AnaliseReferenciavel>(
    chips: DerChipItem[], type: { new(): T; }): T[] {

    const referenciavel: T[] = [];
    chips.forEach(chipItem => {
      const ref = new type();
      ref.id = chipItem.id;

      if (!isNaN(chipItem.text as any)) {
        ref.valor = Number(chipItem.text);
      } else {
        ref.nome = chipItem.text;
      }

      referenciavel.push(ref);
    });
    return referenciavel;
  }

  static converterReferenciaveis(refs: AnaliseReferenciavel[]) {
    return refs.map(ref => new DerChipItem(ref.id, this.retrieveTextFromDER(ref)));
  }

  private static retrieveTextFromDER(ref: AnaliseReferenciavel): string {
    return ref.valor ? ref.valor.toString() : ref.nome;
  }

  // TODO quando for somente o número?
  static converter(valores: string[]): DerChipItem[] {
    if (valores) {
      return this.doConverter(valores);
    }
  }

  private static doConverter(valores: string[]): DerChipItem[] {
    return valores.map(val => {
      return new DerChipItem(undefined, val);
    });
  }

  // TODO pode ser um outro tipo não any?
  static valor(refs: AnaliseReferenciavel[]): number {
    if (!refs) {
      return 0;
    } else if (refs.length === 1 && refs[0].valor) {
      return refs[0].valor;
    } else {
      return refs.length;
    }
  }

}
