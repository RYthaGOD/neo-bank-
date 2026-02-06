use anchor_lang::prelude::*;

/// NeoShield - Built-in security layer for Neo Bank
/// Provides on-chain address validation using local heuristics

/// Result from NeoShield validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidationResult {
    pub is_safe: bool,
    pub risk_score: u8,  // 0-100, higher = more risky
    pub reason_code: u8, // 0=safe, 1=known_scam, 2=suspicious_pattern, 3=blacklisted
}

/// Validate a destination address using NeoShield heuristics
/// 
/// Performs on-chain validation checks for suspicious address patterns.
/// 
/// # Arguments
/// * `destination` - The destination pubkey to validate
/// 
/// # Returns
/// * `Ok(ValidationResult)` with risk assessment
pub fn validate_destination(
    destination: &Pubkey,
) -> Result<ValidationResult> {
    // NeoShield heuristic-based validation:
    // 1. Check if address is all zeros (burn address)
    // 2. Check if address matches known test scam patterns
    
    let dest_bytes = destination.to_bytes();
    
    // Flag burn address as suspicious
    if dest_bytes.iter().all(|&b| b == 0) {
        return Ok(ValidationResult {
            is_safe: false,
            risk_score: 100,
            reason_code: 3, // blacklisted
        });
    }
    
    // Flag addresses with suspicious patterns (all same byte)
    let first_byte = dest_bytes[0];
    if dest_bytes.iter().all(|&b| b == first_byte) {
        return Ok(ValidationResult {
            is_safe: false,
            risk_score: 95,
            reason_code: 2, // suspicious_pattern
        });
    }
    
    // Default: address passes basic checks
    Ok(ValidationResult {
        is_safe: true,
        risk_score: 0,
        reason_code: 0,
    })
}

/// Check if validation result indicates the transaction should be blocked
pub fn should_block_transaction(result: &ValidationResult) -> bool {
    !result.is_safe || result.risk_score > 80
}

/// Log security event for audit trail
pub fn log_security_check(destination: &Pubkey, result: &ValidationResult) {
    msg!(
        "NeoShield Check: dest={}, safe={}, risk={}, reason={}",
        destination,
        result.is_safe,
        result.risk_score,
        result.reason_code
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_normal_address() {
        let normal_key = Pubkey::new_unique();
        let result = validate_destination(&normal_key).unwrap();
        assert!(result.is_safe);
        assert_eq!(result.risk_score, 0);
    }

    #[test]
    fn test_validate_burn_address() {
        let burn_key = Pubkey::new_from_array([0u8; 32]);
        let result = validate_destination(&burn_key).unwrap();
        assert!(!result.is_safe);
        assert_eq!(result.risk_score, 100);
    }

    #[test]
    fn test_validate_suspicious_pattern() {
        let suspicious_key = Pubkey::new_from_array([0xFF; 32]);
        let result = validate_destination(&suspicious_key).unwrap();
        assert!(!result.is_safe);
        assert!(result.risk_score > 80);
    }
}
