package br.com.basis.abaco.repository;

import br.com.basis.abaco.domain.Der;

import org.springframework.data.jpa.repository.*;

import java.util.List;

/**
 * Spring Data JPA repository for the Der entity.
 */
@SuppressWarnings("unused")
public interface DerRepository extends JpaRepository<Der,Long> {

}
