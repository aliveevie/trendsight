import requests

RECALL_KEY = "57f3236691e652e4_5dd73dc0ea97b21e"
SANDBOX_API = "https://api.sandbox.competitions.recall.network"

def test_api():
    print("🔍 Testing Recall API connection...")
    
    # Test 1: Check if we can reach the API
    try:
        r = requests.get(f"{SANDBOX_API}/api/account/portfolio", 
                        headers={"Authorization": f"Bearer {RECALL_KEY}"},
                        timeout=10)
        print(f"✅ API Response Status: {r.status_code}")
        print(f"✅ API Response: {r.text[:200]}...")
        
        if r.status_code == 200:
            data = r.json()
            print(f"✅ Portfolio Data: {data}")
        else:
            print(f"❌ Error: {r.status_code} - {r.text}")
            
    except Exception as e:
        print(f"❌ API Error: {e}")
    
    # Test 2: Try the balance endpoint from docs
    try:
        r = requests.get(f"{SANDBOX_API}/api/balance", 
                        headers={"Authorization": f"Bearer {RECALL_KEY}"},
                        timeout=10)
        print(f"\n🔍 Balance Endpoint Status: {r.status_code}")
        print(f"🔍 Balance Response: {r.text[:200]}...")
    except Exception as e:
        print(f"❌ Balance Endpoint Error: {e}")

if __name__ == "__main__":
    test_api() 