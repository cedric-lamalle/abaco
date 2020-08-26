package br.com.basis.abaco.web.rest;

import br.com.basis.abaco.domain.VwFuncaoDados;
import br.com.basis.abaco.domain.VwFuncaoTransacao;
import br.com.basis.abaco.repository.VwFuncaoDadosRepository;
import br.com.basis.abaco.repository.VwFuncaoTransacaoRepository;
import br.com.basis.abaco.security.AuthoritiesConstants;
import com.codahale.metrics.annotation.Timed;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api")
public class VwFuncaoTransacaoResource {

    private final VwFuncaoTransacaoRepository vwFuncaoTransacaoRepository;

    public VwFuncaoTransacaoResource(VwFuncaoTransacaoRepository vwFuncaoTransacaoRepository) {
        this.vwFuncaoTransacaoRepository = vwFuncaoTransacaoRepository;
    }

    @GetMapping("/vw-funcao-transacaos/{analiseId}")
    @Timed
    @Secured({AuthoritiesConstants.ADMIN, AuthoritiesConstants.USER, AuthoritiesConstants.GESTOR, AuthoritiesConstants.ANALISTA})
    public Set<VwFuncaoTransacao> getFuncaoBySistemaAndModuloAndFuncionalidade(@PathVariable Long analiseId) {
        return vwFuncaoTransacaoRepository.findByAnaliseId(analiseId);
    }

}
