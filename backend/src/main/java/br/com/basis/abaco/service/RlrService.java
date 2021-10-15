package br.com.basis.abaco.service;

import br.com.basis.abaco.domain.Rlr;
import br.com.basis.abaco.domain.VwRlr;
import br.com.basis.abaco.repository.RlrRepository;
import br.com.basis.abaco.service.dto.DropdownDTO;
import br.com.basis.dynamicexports.service.DynamicExportsService;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.springframework.data.domain.Page;
import org.springframework.data.elasticsearch.core.ElasticsearchTemplate;
import org.springframework.data.elasticsearch.core.query.NativeSearchQueryBuilder;
import org.springframework.data.elasticsearch.core.query.SearchQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class RlrService {

    private final ElasticsearchTemplate elasticsearchTemplate;
    private final DynamicExportsService dynamicExportsService;
    private final RlrRepository rlrRepository;

    public RlrService(ElasticsearchTemplate elasticsearchTemplate, DynamicExportsService dynamicExportsService, RlrRepository rlrRepository) {
        this.elasticsearchTemplate = elasticsearchTemplate;
        this.dynamicExportsService = dynamicExportsService;
        this.rlrRepository = rlrRepository;
    }

    public List<VwRlr> bindFilterSearchRlrsSistema(String nome, Long idSistema) {
        QueryBuilder queryBuilderNome = QueryBuilders.boolQuery()
            .must(QueryBuilders.wildcardQuery("nome", "*"+nome+"*"));
        QueryBuilder queryBuilderSistema = QueryBuilders.boolQuery()
            .must(QueryBuilders.matchQuery("idSistema", idSistema));


        QueryBuilder qb = QueryBuilders.boolQuery()
            .must(queryBuilderNome)
            .must(queryBuilderSistema);

        SearchQuery searchQuery = new NativeSearchQueryBuilder()
            .withQuery(qb)
            .withPageable(dynamicExportsService.obterPageableMaximoExportacao())
            .build();
        Page<VwRlr> page = elasticsearchTemplate.queryForPage(searchQuery, VwRlr.class);

        return page.getContent();
    }

    @Transactional(readOnly = true)
    public List<DropdownDTO> getRlrByFuncaoDadosIdDropdown(Long idFuncaoDados) {
        List<DropdownDTO> lstRlrsDrop = new ArrayList<>();
        List<Rlr> lstRlrs = rlrRepository.getRlrByFuncaoDadosIdDropdown(idFuncaoDados);
        lstRlrs.forEach(rlr -> {
            DropdownDTO dropdownRlr;
            if(rlr.getNome() == null || rlr.getNome().isEmpty()){
                dropdownRlr = new br.com.basis.abaco.service.dto.DropdownDTO(rlr.getId(),rlr.getValor().toString());
            }else {
                dropdownRlr = new br.com.basis.abaco.service.dto.DropdownDTO(rlr.getId(),rlr.getNome());
            }
            lstRlrsDrop.add(dropdownRlr);
        });
        return lstRlrsDrop;
    }

    @Transactional(readOnly = true)
    public List<Rlr> getRlrByFuncaoDados(Long idFuncaoDados){
        return rlrRepository.getRlrByFuncaoDadosId(idFuncaoDados);
    }
}
