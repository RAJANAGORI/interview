import threading
balance = 100
lock = threading.Lock()

def redeem_coupon():
    global balance
    # BUG: TOCTOU — check and deduct not atomic
    if balance >= 50:
        threading.Event().wait(0.01)  # simulate delay
        balance -= 50
        return True
    return False
