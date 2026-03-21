import React from "react";
import { Modal } from "react-bootstrap";

function PasswordModal({
  show,
  successfulChange,
  passwordForm,
  setPasswordForm,
  onClose,
  onSubmit,
}) {
  function handleFormChange(e) {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value,
    });
  }

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header>
        <Modal.Title>Update Password</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="updatePW">
          <div>
            <label htmlFor="current_password">Current Password</label>
            <br />
            <input
              type="password"
              id="current_password"
              name="current_password"
              onChange={handleFormChange}
            ></input>
            <br />
          </div>

          <div>
            <label htmlFor="new_password">New Password</label>
            <br />
            <input type="password" name="new_password" onChange={handleFormChange}></input>
            <br />

            <label htmlFor="confirm_password">Confirm Password</label>
            <br />
            <input type="password" name="confirm_password" onChange={handleFormChange}></input>
          </div>
        </form>
        <div id="change-response">
          {successfulChange ? (
            <p style={{ color: "green" }}>Password Changed Successfully</p>
          ) : successfulChange === false ? (
            <p style={{ color: "red" }}>Password Change Unsuccessful</p>
          ) : null}
        </div>
      </Modal.Body>

      <Modal.Footer>
        {successfulChange === null || !successfulChange ? (
          <>
            <button type="button" className="btn btn-outline-danger" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-dark" onClick={onSubmit}>
              Submit
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-dark" onClick={onClose}>
            Close
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default PasswordModal;
