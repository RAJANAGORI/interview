import threading
balance = 100
lock = threading.Lock()

def redeem_coupon():
    global balance
    with lock:
        if balance >= 50:
            balance -= 50
            return True
        return False
