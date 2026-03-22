import React, { useContext } from "react";
import { AppContext } from "./AppContext";

import Auth from "./Auth";
import Profile from "./Profile";
import NavBar from "./NavBar";
import Prints from "./Prints";
import NewPrintForm from "./NewPrintForm";
import DeletePrint from "./DeletePrint";
import UpdatePrintForm from "./UpdatePrintForm";


function App() {
  const { 
    isSignedIn, 
    allPrintsView, 
    addPrintView, 
    profileView, 
    allPrints, 
    handleSignInSubmit, 
    handleSignOut, 
    handlePrintClick, 
    allPrintsClick, 
    addPrintClick, 
    fetchPrints, 
    addPrint, 
    validateForm, 
    deletePrints, 
    updatePrint, 
    fetchProfile, 
    updatePassword,
    profileViewClick
  } = useContext(AppContext); 
  
  return (
    <main>
      <NavBar handleSignOut={handleSignOut} profileViewClick={profileViewClick} />

      <DeletePrint 
        deletePrints={deletePrints} 
        allPrintsClick={allPrintsClick} 
      />
      <UpdatePrintForm 
        allPrintsClick={allPrintsClick} 
        updatePrint={updatePrint} 
        validateForm={validateForm}
        fetchPrints={fetchPrints}
      />

      {/* Show Menu When Signed In */}
      {isSignedIn ? (
        <div id="toggle-views">
          <button type="button" className="view-title" onClick={allPrintsClick}>
            All Prints
          </button>
          <button type="button" className="view-title" onClick={addPrintClick}>
            Add Print
          </button>
        </div>
      ) : !isSignedIn && (
        // Show Sign In Form When Not Signed In
        <Auth />
      )}

      {isSignedIn && allPrintsView ? (
        <Prints />
      ) : isSignedIn && addPrintView ? (
        <NewPrintForm />
      ) : isSignedIn && profileView && (
        <Profile />
      )}
    </main>
  );
}

export default App;