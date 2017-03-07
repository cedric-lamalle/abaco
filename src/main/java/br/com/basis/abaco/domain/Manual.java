package br.com.basis.abaco.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.springframework.data.elasticsearch.annotations.Document;

import javax.persistence.*;
import javax.validation.constraints.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;

/**
 * A Manual.
 */
@Entity
@Table(name = "manual")
@Cache(usage = CacheConcurrencyStrategy.NONSTRICT_READ_WRITE)
@Document(indexName = "manual")
public class Manual implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Size(max = 4000)
    @Column(name = "observacao", length = 4000)
    private String observacao;

    @NotNull
    @DecimalMin(value = "0")
    @DecimalMax(value = "1")
    @Column(name = "valor_variacao_estimada", precision=10, scale=2, nullable = false)
    private BigDecimal valorVariacaoEstimada;

    @NotNull
    @DecimalMin(value = "0")
    @DecimalMax(value = "1")
    @Column(name = "valor_variacao_indicativa", precision=10, scale=2, nullable = false)
    private BigDecimal valorVariacaoIndicativa;

    @Size(max = 20000000)
    @Lob
    @Column(name = "arquivo_manual")
    private byte[] arquivoManual;

    @Column(name = "arquivo_manual_content_type")
    private String arquivoManualContentType;

    @OneToMany(mappedBy = "manual")
    @JsonIgnore
    @Cache(usage = CacheConcurrencyStrategy.NONSTRICT_READ_WRITE)
    private Set<EsforcoFase> esforcoFases = new HashSet<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public Manual nome(String nome) {
        this.nome = nome;
        return this;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getObservacao() {
        return observacao;
    }

    public Manual observacao(String observacao) {
        this.observacao = observacao;
        return this;
    }

    public void setObservacao(String observacao) {
        this.observacao = observacao;
    }

    public BigDecimal getValorVariacaoEstimada() {
        return valorVariacaoEstimada;
    }

    public Manual valorVariacaoEstimada(BigDecimal valorVariacaoEstimada) {
        this.valorVariacaoEstimada = valorVariacaoEstimada;
        return this;
    }

    public void setValorVariacaoEstimada(BigDecimal valorVariacaoEstimada) {
        this.valorVariacaoEstimada = valorVariacaoEstimada;
    }

    public BigDecimal getValorVariacaoIndicativa() {
        return valorVariacaoIndicativa;
    }

    public Manual valorVariacaoIndicativa(BigDecimal valorVariacaoIndicativa) {
        this.valorVariacaoIndicativa = valorVariacaoIndicativa;
        return this;
    }

    public void setValorVariacaoIndicativa(BigDecimal valorVariacaoIndicativa) {
        this.valorVariacaoIndicativa = valorVariacaoIndicativa;
    }

    public byte[] getArquivoManual() {
        return arquivoManual;
    }

    public Manual arquivoManual(byte[] arquivoManual) {
        this.arquivoManual = arquivoManual;
        return this;
    }

    public void setArquivoManual(byte[] arquivoManual) {
        this.arquivoManual = arquivoManual;
    }

    public String getArquivoManualContentType() {
        return arquivoManualContentType;
    }

    public Manual arquivoManualContentType(String arquivoManualContentType) {
        this.arquivoManualContentType = arquivoManualContentType;
        return this;
    }

    public void setArquivoManualContentType(String arquivoManualContentType) {
        this.arquivoManualContentType = arquivoManualContentType;
    }

    public Set<EsforcoFase> getEsforcoFases() {
        return esforcoFases;
    }

    public Manual esforcoFases(Set<EsforcoFase> esforcoFases) {
        this.esforcoFases = esforcoFases;
        return this;
    }

    public Manual addEsforcoFase(EsforcoFase esforcoFase) {
        this.esforcoFases.add(esforcoFase);
        esforcoFase.setManual(this);
        return this;
    }

    public Manual removeEsforcoFase(EsforcoFase esforcoFase) {
        this.esforcoFases.remove(esforcoFase);
        esforcoFase.setManual(null);
        return this;
    }

    public void setEsforcoFases(Set<EsforcoFase> esforcoFases) {
        this.esforcoFases = esforcoFases;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Manual manual = (Manual) o;
        if (manual.id == null || id == null) {
            return false;
        }
        return Objects.equals(id, manual.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "Manual{" +
            "id=" + id +
            ", nome='" + nome + "'" +
            ", observacao='" + observacao + "'" +
            ", valorVariacaoEstimada='" + valorVariacaoEstimada + "'" +
            ", valorVariacaoIndicativa='" + valorVariacaoIndicativa + "'" +
            ", arquivoManual='" + arquivoManual + "'" +
            ", arquivoManualContentType='" + arquivoManualContentType + "'" +
            '}';
    }
}
