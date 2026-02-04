#!/bin/bash
ENV_FILE="/home/craig/neo-bank-/.env"
CRED_FILE="/home/craig/neo-bank-/agent_credentials.json"

echo "=========================================="
echo "   OpenClaw Secure Reconfiguration Tool   "
echo "=========================================="
echo "Please enter your new credentials. Input will be hidden."
echo

# Helper for silent input
get_secret() {
    prompt=$1
    var_name=$2
    read -sp "$prompt: " input
    echo ""
    eval "$var_name='$input'"
}

get_secret "Colosseum API Key" COLOSSEUM_API_KEY
get_secret "Colosseum Claim Code" COLOSSEUM_CLAIM_CODE
get_secret "Colosseum Verification Code" COLOSSEUM_VERIFICATION_CODE
get_secret "OpenAI API Key" OPENAI_API_KEY
get_secret "Gemini API Key" GEMINI_API_KEY
get_secret "DeepSeek API Key" DEEPSEEK_API_KEY
get_secret "Anthropic API Key" ANTHROPIC_API_KEY

echo "Updating $ENV_FILE..."

# Update functions to minimalize sed complexity
update_env_key() {
    key=$1
    val=$2
    # Escape ampersands and backslashes
    escaped_val=$(echo "$val" | sed 's/[\&/]/\\&/g')
    
    if grep -q "^$key=" "$ENV_FILE"; then
        sed -i "s|^$key=.*|$key=$escaped_val|" "$ENV_FILE"
    else
        echo "$key=$val" >> "$ENV_FILE"
    fi
}

update_env_key "COLOSSEUM_API_KEY" "$COLOSSEUM_API_KEY"
update_env_key "COLOSSEUM_CLAIM_CODE" "$COLOSSEUM_CLAIM_CODE"
update_env_key "COLOSSEUM_VERIFICATION_CODE" "$COLOSSEUM_VERIFICATION_CODE"
update_env_key "OPENAI_API_KEY" "$OPENAI_API_KEY"
update_env_key "GEMINI_API_KEY" "$GEMINI_API_KEY"
update_env_key "DEEPSEEK_API_KEY" "$DEEPSEEK_API_KEY"
update_env_key "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"

echo "Environment keys updated."
echo

echo "------------------------------------------"
read -p "Did you register a NEW agent (changing your Agent ID)? [y/N]: " NEW_AGENT

if [[ "$NEW_AGENT" =~ ^[Yy]$ ]]; then
    read -p "New Agent ID: " AGENT_ID
    read -p "New Agent Name: " AGENT_NAME
    
    if [ -f "$CRED_FILE" ]; then
        echo "Updating $CRED_FILE..."
        # Backup
        cp "$CRED_FILE" "${CRED_FILE}.bak"
        
        # Simple inline python to update JSON reliably
        python3 -c "import json; f=open('$CRED_FILE','r'); d=json.load(f); f.close(); d['agent']['id']=int('$AGENT_ID'); d['agent']['name']='$AGENT_NAME'; f=open('$CRED_FILE','w'); json.dump(d,f,indent=4);"
        
        echo "Agent credentials updated."
    else
        echo "Warning: $CRED_FILE not found. Skipping."
    fi
else
    echo "Skipping agent identity update."
fi

echo
echo "=========================================="
echo "Reconfiguration Complete."
echo "Please run 'openclaw agent --status' to verify."
echo "=========================================="
