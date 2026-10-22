package de.haw.usenext.api;

import de.haw.usenext.api.model.OclEvaluationRequest;
import de.haw.usenext.api.model.OclEvaluationResult;
import de.haw.usenext.service.OclEvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OclController implements OclApi {

    private final OclEvaluationService service;

    public OclController(OclEvaluationService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<OclEvaluationResult> evaluateOcl(OclEvaluationRequest request) {
        return ResponseEntity.ok(new OclEvaluationResult(service.evaluate(request.getExpression())));
    }
}
