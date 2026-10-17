from app.core import security


def test_generate_device_key_is_url_safe_and_unique():
    key_a = security.generate_device_key()
    key_b = security.generate_device_key()

    assert key_a != key_b
    assert len(key_a) > 20


def test_verify_device_key_accepts_matching_key():
    key = security.generate_device_key()
    key_hash = security.hash_device_key(key)

    assert security.verify_device_key(key, key_hash) is True


def test_verify_device_key_rejects_wrong_key():
    key = security.generate_device_key()
    key_hash = security.hash_device_key(key)

    assert security.verify_device_key("chave-errada", key_hash) is False
