import requests
from bs4 import BeautifulSoup
import re

def solve_ramp_challenge():
    # Step 1: Fetch the challenge page
    url = "https://tns4lpgmziiypnxxzel5ss5nyu0nftol.lambda-url.us-east-1.on.aws/challenge"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Failed to fetch the page. Status code: {response.status_code}")
        return None
    
    # Step 2: Parse the HTML
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Step 3: Find all section tags with data-id ending with specific patterns
    # We need to find them in order, so we'll search for the specific patterns
    
    # The pattern we're looking for:
    # <section data-id="92*">
    #   <article data-class="*45">
    #     <div data-tag="*78*">
    #       <b class="ref" value="CHARACTER"></b>
    
    hidden_url_chars = []
    
    # Find all section tags that match our pattern
    sections = soup.find_all('section', attrs={'data-id': True})
    
    for section in sections:
        # Check if data-id matches pattern "92*" (starts with 92)
        data_id = section.get('data-id', '')
        if not data_id.startswith('92'):
            continue
            
        # Within this section, find article tags with data-class matching "*45" (ends with 45)
        articles = section.find_all('article', attrs={'data-class': True})
        for article in articles:
            data_class = article.get('data-class', '')
            if not data_class.endswith('45'):
                continue
                
            # Within this article, find div tags with data-tag matching "*78*" (contains 78)
            divs = article.find_all('div', attrs={'data-tag': True})
            for div in divs:
                data_tag = div.get('data-tag', '')
                if '78' not in data_tag:
                    continue
                    
                # Finally, find the b tag with class "ref" and get its value
                b_tag = div.find('b', class_='ref')
                if b_tag and b_tag.get('value'):
                    hidden_url_chars.append(b_tag['value'])
    
    # Step 4: Join all characters to form the URL
    hidden_url = ''.join(hidden_url_chars)
    
    return hidden_url

def get_flag(hidden_url):
    """Visit the hidden URL to get the flag"""
    try:
        response = requests.get(hidden_url)
        if response.status_code == 200:
            return response.text
        else:
            return f"Failed to get flag. Status: {response.status_code}"
    except Exception as e:
        return f"Error: {e}"

# Run the solution
if __name__ == "__main__":
    print("Solving Ramp Challenge...")
    
    hidden_url = solve_ramp_challenge()
    
    if hidden_url:
        print(f"Hidden URL found: {hidden_url}")
        print("\nGetting flag...")
        flag = get_flag(hidden_url)
        print(f"Flag: {flag}")
    else:
        print("Failed to find hidden URL")

# https://tns4lpgmziiypnxxzel5ss5nyu0nftol.lambda-url.us-east-1.on.aws/ramp-challenge-instructions/